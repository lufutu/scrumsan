/**
 * Test script to verify AWS SES setup
 * Run with: node scripts/test-ses-setup.js
 */

const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses')
require('dotenv').config({ path: '.env.local' })

async function testSESSetup() {
  console.log('🧪 Testing AWS SES Setup...\n')
  
  // Check environment variables
  console.log('📋 Environment Variables:')
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`)
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`)
  console.log(`AWS_REGION: ${process.env.AWS_REGION || '❌ Missing'}`)
  console.log(`SES_FROM_EMAIL: ${process.env.SES_FROM_EMAIL || '❌ Missing'}`)
  console.log()
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.SES_FROM_EMAIL) {
    console.log('❌ Missing required environment variables. Please check your .env.local file.')
    return
  }
  
  // Initialize SES client
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
  
  // Test email data
  const testEmail = {
    to: process.env.SES_FROM_EMAIL, // Send to the same verified email
    subject: 'SES Test Email',
    htmlBody: `
      <h1>AWS SES Test</h1>
      <p>This is a test email to verify your AWS SES setup.</p>
      <p>If you receive this email, your SES configuration is working correctly!</p>
      <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
    `,
    textBody: `
AWS SES Test

This is a test email to verify your AWS SES setup.
If you receive this email, your SES configuration is working correctly!

Timestamp: ${new Date().toISOString()}
    `.trim()
  }
  
  try {
    console.log('📧 Sending test email...')
    console.log(`From: ${process.env.SES_FROM_EMAIL}`)
    console.log(`To: ${testEmail.to}`)
    console.log(`Subject: ${testEmail.subject}`)
    console.log()
    
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL,
      Destination: {
        ToAddresses: [testEmail.to],
      },
      Message: {
        Subject: {
          Data: testEmail.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: testEmail.htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: testEmail.textBody,
            Charset: 'UTF-8',
          },
        },
      },
    })
    
    const result = await sesClient.send(command)
    
    console.log('✅ Test email sent successfully!')
    console.log(`Message ID: ${result.MessageId}`)
    console.log()
    console.log('🎉 Your AWS SES setup is working correctly!')
    console.log('You should receive the test email shortly.')
    console.log()
    console.log('Next steps:')
    console.log('1. Check your email inbox for the test message')
    console.log('2. Try sending a team invitation in your app')
    console.log('3. If in sandbox mode, remember you can only send to verified emails')
    
  } catch (error) {
    console.log('❌ Failed to send test email')
    console.log('Error details:', error.message)
    console.log()
    
    if (error.name === 'MessageRejected') {
      console.log('💡 Common solutions:')
      console.log('- Verify your sender email address in AWS SES console')
      console.log('- Check if you\'re in sandbox mode (can only send to verified emails)')
      console.log('- Ensure your AWS credentials have SES permissions')
    } else if (error.name === 'InvalidParameterValue') {
      console.log('💡 Check your email addresses and AWS region settings')
    } else {
      console.log('💡 Check your AWS credentials and SES configuration')
    }
  }
}

// Run the test
testSESSetup().catch(console.error)