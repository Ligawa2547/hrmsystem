'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Download, Check, Printer } from "lucide-react";
import { generateOfferLetterHTML, generatePDF, printOfferLetter } from "@/lib/offer-letter-pdf";

interface OfferLetter {
  id: string;
  applicant_name: string;
  applicant_email: string;
  job_title: string;
  reporting_station: string | null;
  contract_type: string;
  grade_level: string | null;
  expected_start_date: string;
  contract_duration: string;
  acceptance_deadline: string;
  salary_notes: string | null;
  custom_clauses: string | null;
  include_ssafe_ifak: boolean;
  allow_download_unsigned: boolean;
  require_signature_before_download: boolean;
  status: string;
  token_expires_at: string;
}

export default function OfferSignaturePage() {
  const params = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [letter, setLetter] = useState<OfferLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'view' | 'sign'>('view');
  const [signerName, setSignerName] = useState('');
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savedSignatureData, setSavedSignatureData] = useState('');
  const [savedSignatureType, setSavedSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [savedSignatureDate, setSavedSignatureDate] = useState('');

  useEffect(() => {
    async function fetchLetter() {
      try {
        // Create an unauthenticated client to allow public access by token
        // This bypasses RLS restrictions for public token-based access
        const supabase = createClient();
        
        const { data, error: queryError } = await supabase
          .from('offer_letters')
          .select('*')
          .eq('signature_token', params.token as string)
          .single();

        if (queryError || !data) {
          console.log('[v0] Query error:', queryError?.message, 'Data:', data);
          setError('Invalid or expired offer letter link');
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (new Date(data.token_expires_at) < new Date()) {
          // Automatically revoke the offer
          await supabase
            .from('offer_letters')
            .update({ status: 'revoked' })
            .eq('id', data.id);
          setError('This offer letter has expired and been automatically revoked. Please contact HR to request a new offer.');
          setLoading(false);
          return;
        }

        // Check if already revoked
        if (data.status === 'revoked') {
          setError('This offer letter has been revoked. Only HR can re-issue it.');
          setLoading(false);
          return;
        }

        // Check if already signed — fetch the signature record too
        if (data.status === 'signed') {
          setSigned(true);
          const { data: sigRecord } = await supabase
            .from('offer_letter_signatures')
            .select('signature_data, signature_type, signed_at')
            .eq('offer_letter_id', data.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          if (sigRecord) {
            setSavedSignatureData(sigRecord.signature_data);
            setSavedSignatureType(sigRecord.signature_type as 'typed' | 'drawn');
            setSavedSignatureDate(new Date(sigRecord.signed_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            }));
          }
        }

        setLetter(data);
        setSignerName(data.applicant_name);
        
        // Mark as viewed
        await supabase
          .from('offer_letters')
          .update({ viewed_at: new Date().toISOString() })
          .eq('id', data.id);

        // Log audit
        await supabase
          .from('offer_letter_audit_logs')
          .insert({
            offer_letter_id: data.id,
            action: 'viewed',
            details: { ip_address: window.location.hostname },
          });

        setLoading(false);
      } catch (err) {
        console.error('[v0] Error fetching letter:', err);
        setError('Error loading offer letter');
        setLoading(false);
      }
    }

    if (params.token) {
      fetchLetter();
    }
  }, [params.token]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleDrawSignature = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = getCanvasCoordinates(e);
    
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    setIsDrawing(true);
  };

  const stopDrawing = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const handlePrint = () => {
    if (!letter) return;
    const html = generateOfferLetterHTML({
      applicantName: letter.applicant_name,
      applicantEmail: letter.applicant_email,
      jobTitle: letter.job_title,
      reportingStation: letter.reporting_station,
      contractType: letter.contract_type,
      gradeLevel: letter.grade_level,
      expectedStartDate: letter.expected_start_date,
      contractDuration: letter.contract_duration,
      acceptanceDeadline: letter.acceptance_deadline,
      salaryNotes: letter.salary_notes,
      customClauses: letter.custom_clauses,
      includeSsafeIfak: letter.include_ssafe_ifak,
      // Include signature data if the letter has been signed
      ...(signed && savedSignatureData ? {
        signatureData: savedSignatureData,
        signatureType: savedSignatureType,
        signerName: letter.applicant_name,
        signatureDate: savedSignatureDate,
      } : {}),
    }, signed);
    printOfferLetter(html);
  };

  const handleDownload = async () => {
    if (!letter) return;
    
    setDownloading(true);
    
    try {
      const html = generateOfferLetterHTML({
        applicantName: letter.applicant_name,
        applicantEmail: letter.applicant_email,
        jobTitle: letter.job_title,
        reportingStation: letter.reporting_station,
        contractType: letter.contract_type,
        gradeLevel: letter.grade_level,
        expectedStartDate: letter.expected_start_date,
        contractDuration: letter.contract_duration,
        acceptanceDeadline: letter.acceptance_deadline,
        salaryNotes: letter.salary_notes,
        customClauses: letter.custom_clauses,
        includeSsafeIfak: letter.include_ssafe_ifak,
        ...(signed && savedSignatureData ? {
          signatureData: savedSignatureData,
          signatureType: savedSignatureType,
          signerName: letter.applicant_name,
          signatureDate: savedSignatureDate,
        } : {}),
      }, signed);

      const filename = `offer-letter-${letter.job_title.replace(/\s+/g, '-')}.pdf`;
      await generatePDF(html, filename);
      
      setDownloading(false);
      alert('PDF downloaded successfully');
    } catch (error) {
      console.error('[v0] Error generating PDF:', error);
      setDownloading(false);
      alert(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSubmitSignature = async () => {
    if (!letter || !signerName || !consent) {
      alert('Please fill in all fields and accept the terms');
      return;
    }

    setSigning(true);

    try {
      const supabase = createClient();
      
      // Get signature data
      let signatureData = '';
      if (signatureType === 'drawn' && canvasRef.current) {
        signatureData = canvasRef.current.toDataURL('image/png');
      } else {
        signatureData = signerName;
      }

      // Create signature record
      const { error: sigError } = await supabase
        .from('offer_letter_signatures')
        .insert({
          offer_letter_id: letter.id,
          signer_name: signerName,
          signer_email: letter.applicant_email,
          signature_type: signatureType,
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent,
          consent_accepted: consent,
        });

      if (sigError) throw sigError;

      // Update offer letter status
      const { error: updateError } = await supabase
        .from('offer_letters')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', letter.id);

      if (updateError) throw updateError;

      // Log audit
      await supabase
        .from('offer_letter_audit_logs')
        .insert({
          offer_letter_id: letter.id,
          action: 'signed',
          details: {
            signature_type: signatureType,
            ip_address: window.location.hostname,
          },
        });

      // Persist signature so it appears in the printed/downloaded document
      setSavedSignatureData(signatureData);
      setSavedSignatureType(signatureType);
      setSavedSignatureDate(new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      }));
      setSigned(true);
      setStep('view');

      // Send confirmation email
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: letter.applicant_email,
          subject: 'Offer Letter Acceptance Confirmed',
          applicantName: letter.applicant_name,
          jobTitle: letter.job_title,
          type: 'offer_letter_signed',
        })
      });

    } catch (err) {
      console.error('[v0] Error signing:', err);
      alert('Error submitting signature. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 font-semibold mb-4">{error}</p>
            <p className="text-muted-foreground mb-6">Please contact UNDP HR at careers@unoedp.org if you need assistance.</p>
            <Button className="w-full" variant="outline">Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!letter) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white py-12 px-4">
      <div className="max-width-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white font-bold">UNDP ✓</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">Employment Offer Letter</h1>
              <p className="text-muted-foreground">Review, sign, and accept your offer</p>
            </div>
          </div>
        </div>

        {/* Status */}
        {signed && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-6 flex items-center gap-2 text-green-800">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Your offer has been signed and accepted successfully!</span>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Offer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-semibold">{letter.job_title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contract Type</p>
                  <p className="font-semibold">{letter.contract_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start Date</p>
                  <p className="font-semibold">{new Date(letter.expected_start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accept By</p>
                  <p className="font-semibold text-red-600">{new Date(letter.acceptance_deadline).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>

  <Button onClick={handlePrint} variant="outline" className="w-full mt-4">
    <Printer className="h-4 w-4 mr-2" />
    Print / Save as PDF
  </Button>
  {letter.allow_download_unsigned && (
  <Button onClick={handleDownload} variant="outline" className="w-full mt-2" disabled={downloading}>
  {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
  {downloading ? 'Generating PDF...' : 'Download PDF'}
  </Button>
  )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {step === 'view' ? (
              <>
                {/* Offer Letter Preview */}
                <Card>
                  <CardContent className="pt-6">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: generateOfferLetterHTML({
                          applicantName: letter.applicant_name,
                          applicantEmail: letter.applicant_email,
                          jobTitle: letter.job_title,
                          reportingStation: letter.reporting_station,
                          contractType: letter.contract_type,
                          gradeLevel: letter.grade_level,
                          expectedStartDate: letter.expected_start_date,
                          contractDuration: letter.contract_duration,
                          acceptanceDeadline: letter.acceptance_deadline,
                          salaryNotes: letter.salary_notes,
                          customClauses: letter.custom_clauses,
                          includeSsafeIfak: letter.include_ssafe_ifak,
                        }, false)
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Sign Button */}
                {!signed && (
                  <Button 
                    onClick={() => setStep('sign')} 
                    size="lg" 
                    className="w-full mt-6"
                  >
                    Sign & Accept Offer
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* Signature Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sign Your Offer</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Full Legal Name</Label>
                      <Input
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Enter your full name"
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Signature Method</Label>
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="typed"
                            value="typed"
                            checked={signatureType === 'typed'}
                            onChange={(e) => setSignatureType(e.target.value as 'typed')}
                          />
                          <label htmlFor="typed" className="text-sm">Type your signature</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            id="drawn"
                            value="drawn"
                            checked={signatureType === 'drawn'}
                            onChange={(e) => setSignatureType(e.target.value as 'drawn')}
                          />
                          <label htmlFor="drawn" className="text-sm">Draw your signature</label>
                        </div>
                      </div>
                    </div>

                    {signatureType === 'drawn' && (
                      <div>
                        <Label>Draw Signature Below</Label>
                        <p className="text-sm text-muted-foreground mb-2">Use your mouse or finger to draw your signature</p>
                        <canvas
                          ref={canvasRef}
                          width={500}
                          height={200}
                          onMouseDown={startDrawing}
                          onMouseUp={stopDrawing}
                          onMouseMove={handleDrawSignature}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchEnd={stopDrawing}
                          onTouchMove={handleTouchMove}
                          className="mt-2 border-2 border-dashed border-gray-300 rounded w-full cursor-crosshair bg-white touch-none"
                          style={{ touchAction: 'none' }}
                        />
                        <Button 
                          variant="outline" 
                          className="w-full mt-2"
                          onClick={() => {
                            const canvas = canvasRef.current;
                            if (canvas) {
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                              }
                            }
                          }}
                        >
                          Clear Signature
                        </Button>
                      </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded border border-blue-200">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="consent"
                          checked={consent}
                          onCheckedChange={(c) => setConsent(c as boolean)}
                        />
                        <label htmlFor="consent" className="text-sm text-blue-900">
                          I certify that I have read and understand the terms of this offer letter and accept the offer of employment on the terms and conditions outlined herein. I confirm that all information provided is accurate and complete.
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setStep('view')}
                        disabled={signing}
                      >
                        Back
                      </Button>
                      <Button 
                        onClick={handleSubmitSignature}
                        disabled={signing || !signerName || !consent}
                        className="flex-1"
                      >
                        {signing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Sign & Accept
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
