'use client';

// Use the external blob URL so html2pdf can load it via CORS without needing a local file path
const UNEDP_LOGO_URL = 'https://oupmqhc10pd4webz.public.blob.vercel-storage.com/unedp-logo.jpg';

export interface OfferLetterData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  reportingStation?: string;
  contractType: string;
  gradeLevel?: string;
  expectedStartDate: string;
  contractDuration: string;
  acceptanceDeadline: string;
  salaryNotes?: string;
  customClauses?: string;
  includeSsafeIfak: boolean;
  signatureDate?: string;
  signerName?: string;
  // For drawn signatures: a base64 data URL. For typed: the name string.
  signatureData?: string;
  signatureType?: 'typed' | 'drawn';
}

// Format rich text (markdown-like syntax) to HTML
function formatRichText(text: string): string {
  if (!text) return '';
  
  // Convert markdown-like syntax to HTML
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: _text_ or *text*
    .replace(/(?<!\*)_(.+?)_(?!_)/g, '<em>$1</em>')
    .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')
    // Heading-like: **Heading:** at start of line
    .replace(/^<strong>(.+?):<\/strong>/gm, '<strong style="font-size: 12px; color: #003D7A; display: block; margin-top: 15px; margin-bottom: 5px;">$1:</strong>');
  
  // Split into lines for processing
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if it's a bullet point
    if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
      if (!inList) {
        processedLines.push('<ul style="margin: 10px 0; padding-left: 25px; list-style-type: disc;">');
        inList = true;
      }
      const content = trimmedLine.replace(/^[•\-\*]\s*/, '');
      processedLines.push(`<li style="margin-bottom: 6px; line-height: 1.6;">${content}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      
      if (trimmedLine === '') {
        processedLines.push('<br/>');
      } else {
        processedLines.push(`<p style="margin-bottom: 10px; line-height: 1.6;">${trimmedLine}</p>`);
      }
    }
  }
  
  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }
  
  return processedLines.join('\n');
}

export function generateOfferLetterHTML(data: OfferLetterData, isSigned: boolean = false): string {
  const formattedStartDate = new Date(data.expectedStartDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedDeadline = new Date(data.acceptanceDeadline).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const ssafeSection = data.includeSsafeIfak ? `
    <section style="margin-top: 40px; page-break-inside: avoid;">
      <h3 style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 15px; border-bottom: 2px solid #003D7A; padding-bottom: 10px;">
        SSAFE and IFAK 2.0 Requirement
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: #333; margin-bottom: 10px;">
        All UNDP staff members are required to complete and maintain the following safety training certifications:
      </p>
      <ul style="font-size: 11px; line-height: 1.8; color: #333; margin-left: 20px; margin-bottom: 15px;">
        <li><strong>SSAFE (Staff Safety Awareness and Familiarization Education):</strong> An online induction training mandatory for all UN staff.</li>
        <li><strong>IFAK 2.0 (Individual First Aid Kit):</strong> Advanced first aid certification to be completed before your employment start date.</li>
      </ul>
      <p style="font-size: 11px; line-height: 1.6; color: #333; margin-bottom: 10px;">
        <strong>Recognized Training Providers:</strong>
      </p>
      <ul style="font-size: 11px; line-height: 1.8; color: #333; margin-left: 20px; margin-bottom: 15px;">
        <li><strong>IICAR</strong> (www.iicar.org) - International Institute of Career Advancement and Recognition</li>
        <li><strong>UNSSC</strong> (www.unssc.org) - United Nations System Staff College</li>
        <li>Other accredited first aid certification providers approved by UNDP</li>
      </ul>
      <p style="font-size: 11px; line-height: 1.6; color: #333;">
        Proof of completion must be submitted to Human Resources no later than <strong>${formattedDeadline}</strong> — the same deadline as the acceptance of this offer. Failure to provide proof of completion by this date may result in withdrawal of this offer or suspension of employment benefits.
      </p>
    </section>
  ` : '';

  // Render the actual signature mark — drawn = image, typed = styled cursive text
  const signatureMark = (() => {
    if (!data.signatureData) return '';
    if (data.signatureType === 'drawn') {
      return `<img src="${data.signatureData}" style="max-height: 70px; max-width: 100%; display: block;" alt="Signature" />`;
    }
    // Typed: render as cursive script text
    return `<span style="font-family: 'Georgia', serif; font-style: italic; font-size: 26px; color: #1a1a1a; line-height: 1;">${data.signatureData}</span>`;
  })();

  const signatureSection = isSigned ? `
    <section style="margin-top: 50px; page-break-inside: avoid;">
      <h3 style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; border-bottom: 2px solid #003D7A; padding-bottom: 10px;">
        ACCEPTANCE AND SIGNATURE
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: #333; margin-bottom: 30px;">
        I hereby accept the offer of employment on the terms and conditions outlined in this letter.
      </p>

      <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
        <tr>
          <td style="width: 45%; vertical-align: bottom; padding-right: 20px;">
            <div style="min-height: 70px; border-bottom: 2px solid #000; padding-bottom: 6px; display: flex; align-items: flex-end;">
              ${signatureMark}
            </div>
          </td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; vertical-align: bottom;">
            <div style="min-height: 70px; border-bottom: 2px solid #ccc; padding-bottom: 6px;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding-top: 8px; font-size: 10pt; color: #444;">
            <strong style="display: block;">${data.signerName || data.applicantName}</strong>
            <span style="color: #666;">Applicant</span><br/>
            <span style="color: #666;">Date: ${data.signatureDate || todayDate}</span>
          </td>
          <td></td>
          <td style="padding-top: 8px; font-size: 10pt; color: #444;">
            <strong style="display: block;">Authorized HR Representative</strong>
            <span style="color: #666;">UNEDP Human Resources</span><br/>
            <span style="color: #666;">Date: _______________</span>
          </td>
        </tr>
      </table>

      <div style="background-color: #f0f8f0; border: 1px solid #4caf50; border-left: 4px solid #2e7d32; border-radius: 4px; padding: 12px 16px; margin-top: 10px;">
        <p style="font-size: 10pt; color: #2e7d32; margin: 0; font-weight: 600;">
          Electronically signed on ${data.signatureDate || todayDate} &mdash; This document has been accepted by ${data.signerName || data.applicantName}.
        </p>
      </div>
    </section>
  ` : `
    <section style="margin-top: 50px; page-break-inside: avoid;">
      <h3 style="font-size: 14px; font-weight: 700; color: #1a1a1a; margin-bottom: 30px; border-bottom: 2px solid #003D7A; padding-bottom: 10px;">
        ACCEPTANCE AND ACKNOWLEDGEMENT
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: #333; margin-bottom: 30px;">
        I hereby acknowledge receipt of this offer letter and accept the offer of employment on the terms and conditions outlined herein.
      </p>
      
      <table style="width: 100%; margin-bottom: 40px; border-collapse: collapse;">
        <tr>
          <td style="width: 45%; border-bottom: 1px solid #ccc; padding-bottom: 30px; padding-right: 20px;"></td>
          <td style="width: 10%;"></td>
          <td style="width: 45%; border-bottom: 1px solid #ccc; padding-bottom: 30px;"></td>
        </tr>
        <tr>
          <td style="padding-top: 10px; font-size: 10px; color: #666;">
            <strong>Applicant Signature</strong><br/>
            Date: _______________
          </td>
          <td></td>
          <td style="padding-top: 10px; font-size: 10px; color: #666;">
            <strong>Authorized HR Representative</strong><br/>
            Date: ${todayDate}
          </td>
        </tr>
      </table>

      <div style="background-color: #f0f4f8; border-left: 4px solid #003D7A; padding: 15px; margin-top: 30px;">
        <p style="font-size: 11px; color: #333; margin: 0;">
          <strong>⚠️ IMPORTANT:</strong> Please read this letter carefully and sign electronically to confirm your acceptance. You have until <strong>${formattedDeadline}</strong> to accept this offer.
        </p>
      </div>
    </section>
  `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Employment Offer Letter - ${data.applicantName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #2c3e50;
          background-color: #fff;
          font-size: 11pt;
        }
        .container {
          max-width: 850px;
          margin: 0 auto;
          padding: 0;
          background-color: white;
        }
        .letter-body {
          padding: 0 40px 40px 40px;
        }
        h1, h2, h3 {
          color: #003D7A;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-weight: 700;
        }
        h1 {
          font-size: 18pt;
          margin-bottom: 8px;
          margin-top: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        h2 {
          font-size: 14pt;
          margin-top: 24px;
          margin-bottom: 12px;
          border-bottom: 2px solid #003D7A;
          padding-bottom: 8px;
          page-break-after: avoid;
        }
        h3 {
          font-size: 12pt;
          margin-top: 16px;
          margin-bottom: 10px;
          font-weight: 600;
          page-break-after: avoid;
        }
        .letter-content {
          margin-bottom: 20px;
        }
        .letter-content p {
          font-size: 11pt;
          line-height: 1.8;
          color: #2c3e50;
          margin-bottom: 12px;
          text-align: justify;
        }
        .salutation {
          font-size: 11pt;
          margin-bottom: 16px;
          color: #2c3e50;
          font-weight: 500;
        }
        .opening-paragraph {
          background-color: #f0f4f8;
          padding: 14px;
          border-left: 4px solid #003D7A;
          margin-bottom: 16px;
          font-weight: 500;
          font-size: 11pt;
          line-height: 1.7;
          page-break-inside: avoid;
        }
        .opening-paragraph p {
          margin-bottom: 0;
          font-size: 11pt;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
          page-break-inside: avoid;
        }
        .details-table tr {
          border-bottom: 1px solid #ddd;
        }
        .details-table tr:hover {
          background-color: #f9fafb;
        }
        .details-table td {
          padding: 10px 12px;
          vertical-align: top;
        }
        .details-table td:first-child {
          width: 35%;
          font-weight: 600;
          color: #003D7A;
          background-color: #f0f4f8;
        }
        .details-table td:last-child {
          width: 65%;
          color: #2c3e50;
          font-size: 10pt;
        }
        ul, ol {
          margin-left: 24px;
          font-size: 11pt;
          line-height: 1.7;
          color: #2c3e50;
          margin-bottom: 14px;
        }
        li {
          margin-bottom: 6px;
        }
        section {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        strong {
          color: #1a1a1a;
          font-weight: 600;
        }
        em {
          font-style: italic;
          color: #555;
        }
        @page {
          size: A4;
          margin: 15mm 15mm 20mm 15mm;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .container {
            max-width: 100%;
            padding: 0;
            margin: 0;
          }
          .letter-body {
            padding: 0 0 40px 0;
          }
          h1, h2, h3 {
            page-break-after: avoid;
          }
          h2 {
            margin-top: 0;
          }
          p {
            orphans: 3;
            widows: 3;
          }
          section {
            page-break-inside: avoid;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
          ul, ol {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div style="margin-bottom: 0; padding-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 24px 40px 20px 40px; background-color: #ffffff;">
            <!-- Logo and org name -->
            <div style="display: flex; align-items: center; gap: 0;">
              <img
                src="${UNEDP_LOGO_URL}"
                alt="UNEDP Logo"
                style="width: 140px; height: auto; object-fit: contain; display: block;"
                crossorigin="anonymous"
              />
            </div>
            <!-- Document info -->
            <div style="text-align: right;">
              <div style="font-size: 22px; font-weight: 800; color: #003D7A; letter-spacing: 2px; text-transform: uppercase;">Offer Letter</div>
              <div style="width: 100%; height: 2px; background: #003D7A; margin: 6px 0;"></div>
              <div style="font-size: 10.5px; color: #555; margin-top: 4px;">Date: <strong style="color: #1a1a1a;">${todayDate}</strong></div>
              <div style="font-size: 10.5px; color: #555; margin-top: 2px;">Ref: <strong style="color: #1a1a1a;">OL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}</strong></div>
              <div style="font-size: 10px; color: #888; margin-top: 4px;">www.unoedp.org</div>
            </div>
          </div>
          <!-- Full-width colour bar below header -->
          <div style="height: 5px; background: linear-gradient(to right, #003D7A, #0099CC);"></div>
          <div style="height: 2px; background: #C9A84C; margin-bottom: 30px;"></div>
        </div>

        <!-- Main Content -->
        <div class="letter-body">
        <h1>EMPLOYMENT OFFER LETTER</h1>
        
        <div class="letter-content">
          <div class="salutation">Dear ${data.applicantName},</div>

          <div class="opening-paragraph">
            <p>We are pleased to extend an offer of employment to you for the position of <strong>${data.jobTitle}</strong> with the United Nations Development Programme (UNDP).</p>
          </div>

          <p>
            We have reviewed your qualifications and experience and believe you are well-suited for this role. This letter outlines the terms and conditions of employment. Please read it carefully and, if you accept, sign and return a copy by the specified deadline.
          </p>
        </div>

        <!-- Position Details -->
        <section>
          <h2>POSITION DETAILS</h2>
          <table class="details-table">
            <tr>
              <td>Position Title</td>
              <td><strong>${data.jobTitle}</strong></td>
            </tr>
            ${data.reportingStation ? `
            <tr>
              <td>Reporting Station / Duty Station</td>
              <td><strong>${data.reportingStation}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td>Contract Type</td>
              <td><strong>${data.contractType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</strong></td>
            </tr>
            ${data.gradeLevel ? `
            <tr>
              <td>Grade Level</td>
              <td><strong>${data.gradeLevel}</strong></td>
            </tr>
            ` : ''}
            <tr>
              <td>Expected Start Date</td>
              <td><strong>${formattedStartDate}</strong></td>
            </tr>
            <tr>
              <td>Contract Duration</td>
              <td><strong>${data.contractDuration}</strong></td>
            </tr>
          </table>
        </section>

        <!-- Appointment Details -->
        <section>
          <h2>APPOINTMENT DETAILS</h2>
          <p>
            Your appointment is subject to:
          </p>
          <ul>
            <li>Satisfactory completion of pre-employment checks including medical clearance</li>
            <li>Provision of certified copies of educational credentials and professional licenses</li>
            <li>Verification of employment history and references</li>
            <li>Successful completion of background security check</li>
            <li>Fulfillment of any visa or work permit requirements</li>
          </ul>
        </section>

  <!-- Compensation and Benefits -->
  ${data.salaryNotes ? `
  <section>
  <h2>COMPENSATION AND BENEFITS</h2>
  <div style="font-size: 11px; color: #333;">
  ${formatRichText(data.salaryNotes)}
  </div>
  </section>
  ` : ''}

        <!-- Conditions of Appointment -->
        <section>
          <h2>CONDITIONS OF APPOINTMENT</h2>
          <p>
            Your employment with UNDP is on the following basis:
          </p>
          <ul>
            <li><strong>Probation Period:</strong> A probation period of 3 months applies, during which either party may terminate the appointment with one week's written notice.</li>
            <li><strong>Code of Conduct:</strong> You must adhere to the UNDP Code of Conduct and UN Staff Rules and Regulations.</li>
            <li><strong>Confidentiality:</strong> All information obtained during employment must be treated as confidential.</li>
            <li><strong>Conflict of Interest:</strong> You must declare any conflict of interest and comply with UN conflict resolution procedures.</li>
            <li><strong>Notice Period:</strong> After the probation period, either party must provide 30 days' written notice for termination.</li>
          </ul>
        </section>

        <!-- SSAFE and IFAK Section -->
        ${ssafeSection}

        <!-- Custom Clauses -->
        ${data.customClauses ? `
        <section>
          <h2>ADDITIONAL TERMS AND CONDITIONS</h2>
          <p>${data.customClauses.split('\\n').join('</p><p>')}</p>
        </section>
        ` : ''}

        <!-- Acceptance Instructions -->
        <section>
          <h2>ACCEPTANCE OF OFFER</h2>
          <p>
            Please confirm your acceptance of this offer by signing the electronic signature form and submitting it before <strong>${formattedDeadline}</strong>. If we do not receive your signed acceptance by this date, we may withdraw the offer and offer the position to another candidate.
          </p>
          <p>
            Please note that the deadline for submitting any required documentation — including proof of training certifications, educational credentials, and other pre-employment requirements — is also <strong>${formattedDeadline}</strong>, coinciding with the acceptance deadline.
          </p>
          <p>
            If you have any questions regarding this offer, please do not hesitate to contact our Human Resources department at <strong>careers@unoedp.org</strong>.
          </p>
        </section>

        <!-- Signature Section -->
        ${signatureSection}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 10px; color: #999;">
          <p>United Nations Economic Development Foundation &nbsp;|&nbsp; www.unoedp.org &nbsp;|&nbsp; careers@unoedp.org</p>
          <p style="margin-top: 4px;">This is an official employment offer letter issued by UNEDP.</p>
        </div>
        </div><!-- end letter-body -->
      </div>
    </body>
    </html>
  `;
}



export function printOfferLetter(html: string): void {
  // Open a new window with the offer letter HTML and trigger print
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Please allow pop-ups to print the offer letter.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for images and fonts to load then trigger print dialog
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };
}

export async function generatePDF(html: string, filename: string): Promise<void> {
  // Dynamic import to ensure html2pdf only loads in browser
  const html2pdf = (await import('html2pdf.js')).default;
  
  return new Promise((resolve, reject) => {
    try {
      const element = document.createElement('div');
      element.innerHTML = html;
      element.style.backgroundColor = '#ffffff';
      element.style.padding = '0';
      element.style.margin = '0';
      
      // Append to DOM temporarily but hidden
      element.style.position = 'absolute';
      element.style.left = '-99999px';
      element.style.top = '-99999px';
      document.body.appendChild(element);

      // Wait for any images to load
      setTimeout(() => {
        const options = {
          margin: [10, 10, 10, 10],
          filename: filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { 
            scale: 1.5,
            useCORS: true, 
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            removeContainer: true,
            windowWidth: 850,
            windowHeight: 1100
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait'
          },
          pagebreak: { 
            mode: 'avoid-all'
          }
        };

        html2pdf()
          .set(options)
          .from(element)
          .save()
          .then(() => {
            console.log('[v0] PDF generated successfully');
            document.body.removeChild(element);
            resolve();
          })
          .catch((error: any) => {
            console.error('[v0] PDF generation error:', error);
            document.body.removeChild(element);
            reject(new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`));
          });
      }, 500);
    } catch (error: any) {
      console.error('[v0] PDF generation exception:', error);
      reject(new Error(`Failed to generate PDF: ${error?.message || 'Unknown error'}`));
    }
  });
}
