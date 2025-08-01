/**
 * Email utilities for sending invitations and notifications
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

interface InvitationEmailData {
  to: string
  organizationName: string
  inviterName: string
  role: string
  token: string
  expiresAt: Date
}

// Initialize AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

/**
 * Send an invitation email to a new team member
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<void> {
  const { to, organizationName, inviterName, role, token, expiresAt } = data

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const expiryDate = expiresAt.toLocaleDateString()

  // Check if AWS SES is configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SES_FROM_EMAIL) {
    console.log('=== INVITATION EMAIL (AWS SES NOT CONFIGURED) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: You're invited to join ${organizationName}`)
    console.log(`
    Hi there!
    
    ${inviterName} has invited you to join ${organizationName} as a ${role}.
    
    To accept this invitation, click the link below:
    ${inviteUrl}
    
    This invitation will expire on ${expiryDate}.
    
    If you don't have an account yet, you'll be able to create one when you accept the invitation.
    
    Best regards,
    The ${organizationName} Team
    `)
    console.log('========================')
    console.log('To enable email sending, add these environment variables:')
    console.log('- AWS_ACCESS_KEY_ID')
    console.log('- AWS_SECRET_ACCESS_KEY')
    console.log('- AWS_REGION')
    console.log('- SES_FROM_EMAIL')
    return
  }

  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: `You're invited to join ${organizationName}`,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: generateInvitationEmailTemplate(data),
            Charset: 'UTF-8',
          },
          Text: {
            Data: generateInvitationEmailText(data),
            Charset: 'UTF-8',
          },
        },
      },
    })

    const result = await sesClient.send(command)
    console.log('✅ Invitation email sent successfully:', {
      messageId: result.MessageId,
      to,
      organizationName,
    })
  } catch (error) {
    console.error('❌ Failed to send invitation email via AWS SES:', error)

    // Fall back to console logging if SES fails
    console.log('=== INVITATION EMAIL (SES FAILED - FALLBACK) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: You're invited to join ${organizationName}`)
    console.log(`Invite URL: ${inviteUrl}`)
    console.log('========================')

    throw error
  }
}

/**
 * Generate HTML template for invitation email
 */
function generateInvitationEmailTemplate(data: InvitationEmailData): string {
  const { organizationName, inviterName, role, token, expiresAt } = data
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>You're invited to join ${organizationName}</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 48px 40px 32px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
                  <div style="background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                    <div style="font-size: 36px;">👋</div>
                  </div>
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                    You're invited!
                  </h1>
                  <p style="margin: 8px 0 0; font-size: 18px; color: rgba(255, 255, 255, 0.9);">
                    Join ${organizationName}
                  </p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <p style="font-size: 18px; margin: 0 0 16px; color: #374151;">
                      Hi there! 👋
                    </p>
                    <p style="font-size: 16px; margin: 0; color: #6b7280; line-height: 1.7;">
                      <strong style="color: #1f2937;">${inviterName}</strong> has invited you to join 
                      <strong style="color: #1f2937;">${organizationName}</strong> as a 
                      <span style="background-color: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${role}</span>.
                    </p>
                  </div>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 40px 0;">
                    <a href="${inviteUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(102, 126, 234, 0.39); transition: all 0.3s ease;">
                      ✨ Accept Invitation
                    </a>
                  </div>
                  
                  <!-- Info Box -->
                  <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 32px 0; position: relative;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="font-size: 20px; margin-right: 12px;">⏰</div>
                      <div>
                        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
                          Invitation expires on ${expiryDate}
                        </p>
                        <p style="margin: 4px 0 0; font-size: 13px; color: #b45309;">
                          Don't wait too long to accept!
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Features -->
                  <div style="margin: 32px 0;">
                    <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0 0 16px; text-align: center;">
                      What you'll get access to:
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center;">
                      <div style="flex: 1; min-width: 140px; text-align: center; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 24px; margin-bottom: 8px;">📊</div>
                        <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">Project Management</p>
                      </div>
                      <div style="flex: 1; min-width: 140px; text-align: center; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 24px; margin-bottom: 8px;">👥</div>
                        <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">Team Collaboration</p>
                      </div>
                      <div style="flex: 1; min-width: 140px; text-align: center; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
                        <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 500;">Analytics & Reports</p>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Account Info -->
                  <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 32px 0;">
                    <div style="display: flex; align-items: flex-start;">
                      <div style="font-size: 20px; margin-right: 12px;">💡</div>
                      <div>
                        <p style="margin: 0; font-size: 14px; color: #0c4a6e; font-weight: 600;">
                          New to our platform?
                        </p>
                        <p style="margin: 4px 0 0; font-size: 13px; color: #075985;">
                          No worries! You'll be able to create your account when you accept the invitation.
                        </p>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 32px 40px; background-color: #f8fafc; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      Can't click the button? Copy and paste this link:
                    </p>
                    <div style="background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; margin: 12px 0; word-break: break-all;">
                      <a href="${inviteUrl}" style="color: #2563eb; text-decoration: none; font-family: 'Courier New', monospace; font-size: 13px;">
                        ${inviteUrl}
                      </a>
                    </div>
                  </div>
                  
                  <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      Best regards,<br>
                      <strong style="color: #1f2937;">The ${organizationName} Team</strong>
                    </p>
                    <p style="margin: 16px 0 0; font-size: 12px; color: #9ca3af;">
                      This invitation was sent to you because ${inviterName} added your email to ${organizationName}.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

/**
 * Generate plain text version for invitation email
 */
function generateInvitationEmailText(data: InvitationEmailData): string {
  const { organizationName, inviterName, role, token, expiresAt } = data
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const expiryDate = expiresAt.toLocaleDateString()

  return `
You're invited to join ${organizationName}

Hi there!

${inviterName} has invited you to join ${organizationName} as a ${role}.

To accept this invitation, click the link below or copy and paste it into your browser:
${inviteUrl}

This invitation will expire on ${expiryDate}.

If you don't have an account yet, you'll be able to create one when you accept the invitation.

Best regards,
The ${organizationName} Team
  `.trim()
}