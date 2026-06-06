import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      to, 
      cc,
      subject, 
      body: emailBody, 
      htmlBody,
      inboxId,
      applicantName,
      jobTitle,
      applicationId,
      fromName = 'UNEDF Team',
      type = 'general'
    } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to and subject' },
        { status: 400 }
      );
    }

    // Build email content based on type
    let htmlContent = htmlBody || `<p>${emailBody || ''}</p>`;
    let textContent = emailBody || subject;

    if (type === 'application_confirmation') {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      const deadlineStr = deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
              .subheader { font-size: 12px; color: #666; }
              .content { margin-bottom: 30px; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; font-weight: 600; color: #1e40af; margin-bottom: 12px; border-left: 3px solid #1e40af; padding-left: 12px; }
              .highlight-box { background-color: #f0f4ff; border-left: 4px solid #1e40af; padding: 15px; margin: 20px 0; }
              .deadline { background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; }
              .requirement { margin-left: 20px; margin-bottom: 10px; }
              .requirement-item { margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #d1d5db; }
              .footer { background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; font-size: 12px; color: #666; }
              a { color: #1e40af; text-decoration: none; }
              a:hover { text-decoration: underline; }
              .contact-info { background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">UNDP ✓</div>
                <div class="subheader">United Nations Development Programme</div>
                <div style="font-size: 11px; color: #059669; margin-top: 5px;">✓ Verified Email</div>
              </div>

              <div class="content">
                <p>Dear ${applicantName},</p>

                <div class="highlight-box">
                  <strong>Application Received</strong><br/>
                  Thank you for your interest in the <strong>${jobTitle}</strong> position. We have successfully received your application and sincerely appreciate your interest in joining our team.
                </div>

                <div class="section">
                  <div class="section-title">Next Steps</div>
                  <p>Due to the high volume of applications we receive, we are unable to schedule individual meetings with every applicant. However, we value your interest and would like to hear more about you through the following process:</p>
                </div>

                <div class="section">
                  <div class="section-title">Video Interview & Key Questions</div>
                  <p>Please record a brief video (3-5 minutes) answering the following questions. You may submit your video using:</p>
                  <div class="requirement">
                    <div class="requirement-item"><strong>Option 1:</strong> <a href="https://loom.com" target="_blank">Loom.com</a> (Recommended - easy recording and upload)</div>
                    <div class="requirement-item"><strong>Option 2:</strong> <a href="https://drive.google.com" target="_blank">Google Drive</a> (Upload video file directly)</div>
                  </div>
                  
                  <p style="margin-top: 20px; font-weight: 600; color: #1e40af;">Please address the following in your video (5-7 minutes):</p>
                  <div class="requirement">
                    <div class="requirement-item"><strong>1. Personal Introduction:</strong> Introduce yourself by name. Share an overview of your professional qualifications, educational background, and core skills. Tell us what drives your career and why you're passionate about development work.</div>
                    <div class="requirement-item"><strong>2. Current Role & Position:</strong> What is your current position/role? If not currently employed, tell us about your most recent position and what you've been doing.</div>
                    <div class="requirement-item"><strong>3. Relevant Experience:</strong> Describe your past roles and how they've prepared you for the ${jobTitle} position. Highlight key achievements that demonstrate your suitability for this role.</div>
                    <div class="requirement-item"><strong>4. Professional Certifications:</strong> Mention any professional certifications or credentials you currently hold that are relevant to this position. If you don't have specific certifications but are willing to obtain them if required for the role, please state this clearly.</div>
                    <div class="requirement-item"><strong>5. Availability for Deployment:</strong> When would you be available to start working with UNDP if selected? Are there any constraints or notice periods?</div>
                    <div class="requirement-item"><strong>6. Background Check Authorization:</strong> Please confirm that you authorize UNDP to conduct a comprehensive background check relevant to the ${jobTitle} position. This may include verification of educational credentials, employment history, and other relevant checks as permitted by law.</div>
                  </div>
                  <p style="margin-top: 15px; font-style: italic; color: #666;">These questions help us thoroughly understand your background, qualifications, and fit for the role.</p>
                </div>

                <div class="section">
                  <div class="section-title">Required Documents</div>
                  <p>Please prepare and submit the following documents:</p>
                  <div class="requirement">
                    <div class="requirement-item">✓ Valid government-issued ID (Passport, National ID, or Driver's License)</div>
                    <div class="requirement-item">✓ Educational certificates/qualifications relevant to the position</div>
                    <div class="requirement-item">✓ Any additional certifications or credentials</div>
                  </div>
                  <p style="margin-top: 15px;">You may submit these documents by:</p>
                  <div class="requirement">
                    <div class="requirement-item">• Replying to this email with the documents attached</div>
                    <div class="requirement-item">• Uploading to <a href="https://drive.google.com" target="_blank">Google Drive</a> and sharing the link</div>
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">How to Submit Your Video & Documents</div>
                  <p>Once you've recorded your video answering the questions above, please submit as follows:</p>
                  <div class="requirement">
                    <div class="requirement-item"><strong>Video:</strong> Share your Loom link or upload your video to Google Drive and share the link in your reply</div>
                    <div class="requirement-item"><strong>ID Document:</strong> Scan or photograph your government-issued ID (Passport, National ID, or Driver's License) and include it</div>
                    <div class="requirement-item"><strong>Educational Certificates:</strong> Include scans of your educational qualifications and any relevant certifications</div>
                  </div>
                  <p style="margin-top: 15px;"><strong>Reply to this email with:</strong></p>
                  <div style="background-color: #f0f4ff; border-left: 3px solid #1e40af; padding: 12px; margin: 10px 0;">
                    - Your video interview link<br/>
                    - Your documents (attached or Google Drive links)<br/>
                    - Brief introduction if not covered in video
                  </div>
                </div>

                <div class="deadline">
                  <strong>Important: Submission Deadline</strong><br/>
                  Please submit your video interview and required documents by <strong>${deadlineStr}</strong> (3 days from your application submission).<br/>
                  <span style="font-size: 13px; color: #92400e;">Applications and documents received after this deadline may not be considered.</span>
                </div>

                <div class="section">
                  <div class="section-title">Questions?</div>
                  <p>If you have any questions about the application process or need assistance, please don't hesitate to reach out to us at <a href="mailto:careers@unoedp.org">careers@unoedp.org</a>.</p>
                </div>

                <p>Thank you again for your interest in the ${jobTitle} position. We look forward to learning more about you.</p>

                <p>Best regards,<br/>
                <strong>UNDP Recruitment Team</strong><br/>
                United Nations Development Programme</p>
              </div>

              <div class="footer">
                <p><strong>UNDP | Careers ✓ Verified</strong></p>
                <p>This is an automated message. Please do not reply with attachments to this address. Use the reply function or submit documents through Google Drive.</p>
                <p style="margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 10px;">© ${new Date().getFullYear()} United Nations Development Programme. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      textContent = `
Application Confirmation for ${jobTitle} Position

Dear ${applicantName},

Thank you for your interest in the ${jobTitle} position at UNDP. We have successfully received your application.

PLEASE ANSWER THESE QUESTIONS IN A VIDEO (5-7 minutes):

1. PERSONAL INTRODUCTION
   Introduce yourself by name. Share an overview of your professional qualifications, educational background, and core skills. Tell us what drives your career and why you're passionate about development work.

2. CURRENT ROLE & POSITION
   What is your current position/role? If not currently employed, tell us about your most recent position and what you've been doing.

3. RELEVANT EXPERIENCE
   Describe your past roles and how they've prepared you for the ${jobTitle} position. Highlight key achievements that demonstrate your suitability for this role.

4. PROFESSIONAL CERTIFICATIONS
   Mention any professional certifications or credentials you currently hold that are relevant to this position. If you don't have specific certifications but are willing to obtain them if required for the role, please state this clearly.

5. AVAILABILITY FOR DEPLOYMENT
   When would you be available to start working with UNDP if selected? Any constraints or notice periods?

6. BACKGROUND CHECK AUTHORIZATION
   Please confirm that you authorize UNDP to conduct a comprehensive background check relevant to the ${jobTitle} position. This may include verification of educational credentials, employment history, and other relevant checks as permitted by law.

HOW TO SUBMIT:
- Record a video on Loom.com or Google Drive answering all the above questions
- Attach or share links to:
  * Your video interview
  * Valid government-issued ID (Passport, National ID, or Driver's License)
  * Educational certificates and any professional certifications
- Reply to this email with all materials

SUBMISSION DEADLINE: ${deadlineStr} (3 days from today)

Questions? Contact: careers@unoedp.org

Best regards,
UNDP Recruitment Team
United Nations Development Programme
      `;
    }

    // Handle offer letter sent type
    if (type === 'offer_letter_sent') {
      const { signatureToken, offerLetterId, acceptanceDeadline } = body;
      const signingLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://unoedp.org'}/offer/${signatureToken}`;
      const deadlineDate = new Date(acceptanceDeadline);
      const deadlineStr = deadlineDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const daysUntil = Math.ceil((deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 3px solid #003D7A; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #003D7A; margin-bottom: 5px; }
              .content { margin-bottom: 30px; }
              .highlight-box { background-color: #f0f4f8; border-left: 4px solid #003D7A; padding: 15px; margin: 20px 0; }
              .deadline { background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; }
              .button { display: inline-block; background-color: #003D7A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: 600; }
              .button:hover { background-color: #002850; }
              .footer { background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; font-size: 12px; color: #666; }
              a { color: #003D7A; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">UNDP ✓</div>
                <div style="font-size: 12px; color: #666;">United Nations Development Programme</div>
                <div style="font-size: 11px; color: #059669; margin-top: 5px;">✓ Verified Email</div>
              </div>

              <div class="content">
                <p>Dear ${applicantName},</p>

                <div class="highlight-box">
                  <strong>Employment Offer Letter Received</strong><br/>
                  We are pleased to offer you the position of <strong>${jobTitle}</strong> at UNDP. Please review your offer letter and accept it by signing electronically below.
                </div>

                <h3>Next Steps</h3>
                <p>To review and accept your offer letter, please click the button below to access your secure signing portal:</p>

                <center>
                  <a href="${signingLink}" class="button">Review & Sign Offer Letter</a>
                </center>

                <p>Or copy and paste this link in your browser:<br/>
                <code style="background-color: #f3f4f6; padding: 10px; display: block; word-break: break-all; font-size: 12px;">${signingLink}</code>
                </p>

                <div class="deadline">
                  <strong>Important: Acceptance Deadline</strong><br/>
                  <strong style="font-size: 14px; color: #d97706;">${deadlineStr}</strong> (${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining)<br/>
                  <p style="margin-top: 8px; margin-bottom: 0;">Please sign and accept this offer letter by the deadline. After this date, the offer will be automatically revoked and cannot be signed. Only our HR team can re-issue it.</p>
                </div>

                <h3>What to Expect</h3>
                <ul>
                  <li>Review the complete terms and conditions of your employment</li>
                  <li>Sign electronically using your typed signature or by drawing your signature</li>
                  <li>Receive immediate confirmation of your acceptance</li>
                  <li>Get a copy of the signed offer letter via email</li>
                </ul>

                <p>If you have any questions or concerns about your offer, please contact our Human Resources team at <a href="mailto:careers@unoedp.org">careers@unoedp.org</a>.</p>

                <p>We look forward to welcoming you to the UNDP team!</p>

                <p>Best regards,<br/>
                <strong>UNDP Human Resources Team</strong><br/>
                United Nations Development Programme</p>
              </div>

              <div class="footer">
                <p><strong>UNDP | Employment ✓ Verified</strong></p>
                <p>This is an official employment offer. The offer link will expire on ${deadlineStr}. Please act promptly to accept your offer.</p>
                <p style="margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 10px;">© ${new Date().getFullYear()} United Nations Development Programme. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      textContent = `
Employment Offer Letter

Dear ${applicantName},

We are pleased to offer you the position of ${jobTitle} at UNDP.

REVIEW AND SIGN YOUR OFFER LETTER:

Click the link below to access your secure signing portal and review your complete offer letter:

${signingLink}

ACCEPTANCE DEADLINE: ${deadlineStr} (${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining)

Please sign and accept this offer letter by the deadline. After this date, the offer will be automatically revoked and cannot be signed. Only our HR team can re-issue it.

If you have any questions, contact: careers@unoedp.org

Best regards,
UNEDF Human Resources Team
United Nations Economic Development Foundation
      `;
    }

    // Handle offer letter signed (confirmation)
    if (type === 'offer_letter_signed') {
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 3px solid #003D7A; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #003D7A; margin-bottom: 5px; }
              .success-box { background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; border-radius: 4px; }
              .success-box p { color: #065f46; margin: 0; }
              .footer { background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">UNDP ✓</div>
                <div style="font-size: 12px; color: #666;">United Nations Development Programme</div>
                <div style="font-size: 11px; color: #059669; margin-top: 5px;">✓ Verified Email</div>
              </div>

              <div class="content">
                <p>Dear ${applicantName},</p>

                <div class="success-box">
                  <p><strong>✓ Offer Accepted</strong><br/>
                  Your employment offer for the position of <strong>${jobTitle}</strong> has been successfully signed and accepted.</p>
                </div>

                <h3>What Happens Next</h3>
                <p>Our Human Resources team will be in touch shortly to provide you with:</p>
                <ul>
                  <li>Final employment documentation</li>
                  <li>Pre-employment requirements and onboarding information</li>
                  <li>Start date confirmation and next steps</li>
                  <li>Contact information for your direct supervisor</li>
                </ul>

                <p>A signed copy of your offer letter has been saved and you can download it from your applicant portal.</p>

                <p>Welcome to UNDP! We're excited to have you join our team.</p>

                <p>Best regards,<br/>
                <strong>UNDP Human Resources Team</strong><br/>
                United Nations Development Programme</p>
              </div>

              <div class="footer">
                <p><strong>UNDP | Employment ✓ Verified</strong></p>
                <p>© ${new Date().getFullYear()} United Nations Development Programme. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      textContent = `
Offer Letter Acceptance Confirmed

Dear ${applicantName},

Your employment offer for the position of ${jobTitle} has been successfully signed and accepted.

Our Human Resources team will be in touch shortly with next steps and onboarding information.

Welcome to UNDP!

Best regards,
UNDP Human Resources Team
United Nations Development Programme
      `;
    }

    // Handle reminder type
    if (type === 'reminder') {
      const { deadlineStr, customMessage } = body;
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { border-bottom: 3px solid #1e40af; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 5px; }
              .subheader { font-size: 12px; color: #666; }
              .automated-notice { background-color: #e0e7ff; border: 1px solid #6366f1; border-radius: 6px; padding: 12px 16px; margin-bottom: 25px; font-size: 12px; color: #3730a3; }
              .automated-notice strong { color: #1e3a8a; }
              .content { margin-bottom: 30px; }
              .urgent-box { background-color: #fef3c7; border-left: 4px solid #d97706; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
              .urgent-box strong { color: #92400e; }
              .deadline { background-color: #fee2e2; border: 2px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center; }
              .deadline strong { color: #b91c1c; font-size: 16px; }
              .requirement { margin-left: 20px; margin-bottom: 10px; }
              .requirement-item { margin-bottom: 8px; padding-left: 10px; border-left: 2px solid #d1d5db; }
              .custom-message { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
              .footer { background-color: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; font-size: 11px; color: #666; }
              a { color: #1e40af; text-decoration: none; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">UNEDP</div>
                <div class="subheader">UN Economic Development Programme - Human Resources</div>
              </div>

              <div class="automated-notice">
                <strong>AUTOMATED REMINDER</strong> - This is an automated message from the UNEDP Human Resources system regarding your application for the <strong>${jobTitle}</strong> position.
              </div>

              <div class="content">
                <p>Dear ${applicantName},</p>

                <div class="urgent-box">
                  <strong>Action Required</strong><br/>
                  We are writing to remind you that we have not yet received all the required documents and information for your application for the <strong>${jobTitle}</strong> position.
                </div>

                <p>To continue processing your application, please submit the following:</p>

                <div class="requirement">
                  <div class="requirement-item"><strong>Video Interview:</strong> A 5-7 minute video answering the questions outlined in your original confirmation email. You can use <a href="https://loom.com">Loom.com</a> or upload to Google Drive.</div>
                  <div class="requirement-item"><strong>Government ID:</strong> A clear scan or photo of your valid passport, national ID, or driver's license.</div>
                  <div class="requirement-item"><strong>Educational Certificates:</strong> Copies of your degrees, diplomas, and relevant certifications.</div>
                  <div class="requirement-item"><strong>Professional Certifications:</strong> Any additional professional credentials relevant to the position.</div>
                </div>

                ${customMessage ? `<div class="custom-message"><strong>Additional Note from HR:</strong><br/>${customMessage}</div>` : ''}

                <div class="deadline">
                  <strong>Submission Deadline: ${deadlineStr}</strong><br/>
                  <span style="font-size: 13px; color: #991b1b;">Please submit all required documents by this date to remain under consideration.</span>
                </div>

                <p><strong>How to Submit:</strong></p>
                <ul>
                  <li>Reply directly to this email with your documents attached</li>
                  <li>Or share Google Drive links to your video and documents</li>
                </ul>

                <p>If you have already submitted these documents, please disregard this reminder. If you have any questions or need assistance, please contact us at <a href="mailto:careers@unoedp.org">careers@unoedp.org</a>.</p>

                <p>Thank you for your interest in joining UNEDP.</p>

                <p>Best regards,<br/>
                <strong>UNEDP Human Resources Team</strong><br/>
                UN Economic Development Programme</p>
              </div>

              <div class="footer">
                <p><strong>UNEDP Human Resources | Automated Notification</strong></p>
                <p>This is an automated email sent by the UNEDP HR system. Please do not reply directly to this email address for general inquiries. For questions about your application, contact <a href="mailto:careers@unoedp.org">careers@unoedp.org</a>.</p>
                <p style="margin-top: 10px; border-top: 1px solid #d1d5db; padding-top: 10px;">© ${new Date().getFullYear()} UN Economic Development Programme. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      textContent = `
AUTOMATED REMINDER - UNEDP Human Resources System

Dear ${applicantName},

This is an automated reminder regarding your application for the ${jobTitle} position at UNEDP.

ACTION REQUIRED: We have not yet received all the required documents and information for your application.

Please submit the following:
- Video Interview (5-7 minutes) answering the questions from your confirmation email
- Government-issued ID (passport, national ID, or driver's license)
- Educational certificates and degrees
- Professional certifications (if applicable)

${customMessage ? `ADDITIONAL NOTE FROM HR:\n${customMessage}\n` : ''}

DEADLINE: ${deadlineStr}

Please submit all required documents by this date to remain under consideration.

HOW TO SUBMIT:
- Reply to this email with documents attached
- Or share Google Drive links

If you have already submitted these documents, please disregard this reminder.

Questions? Contact: careers@unoedp.org

Best regards,
UNEDP Human Resources Team
UN Economic Development Programme

---
This is an automated email from the UNEDP HR system.
      `;
    }

    // Handle admin_compose type (custom from name)
    if (type === 'admin_compose') {
      htmlContent = htmlBody || `<p>${emailBody}</p>`;
      textContent = emailBody;
    }

    // Build from address with custom name
    const fromAddress = fromName && fromName !== 'noreply' 
      ? `${fromName} <noreply@unoedp.org>`
      : 'noreply@unoedp.org';

    // Send email via Resend
    console.log('[v0] Sending email to:', to, 'from:', fromAddress);
    const emailPayload: any = {
      from: fromAddress,
      to: to,
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    // Add CC if provided
    if (cc) {
      emailPayload.cc = cc;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[v0] Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    const resendData = await response.json();
    console.log('[v0] Email sent successfully:', resendData.id);

    // Store reply in database if inboxId is provided
    if (inboxId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from('email_replies')
            .insert([
              {
                inbox_id: inboxId,
                from_email: 'noreply@unoedp.org',
                to_email: to,
                subject: subject,
                body: textContent,
                html_body: htmlContent,
                status: 'sent',
                sent_at: new Date().toISOString(),
                created_by: user.id,
              },
            ]);
        }
      } catch (dbError) {
        console.error('[v0] Error storing reply:', dbError);
        // Don't fail the whole request if we can't store the reply
      }
    }

    return NextResponse.json({ success: true, id: resendData.id });
  } catch (error) {
    console.error('[v0] Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
