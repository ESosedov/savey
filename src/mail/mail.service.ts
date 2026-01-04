import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;
  private publicDomain: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    this.resend = new Resend(apiKey);
    this.publicDomain = this.configService.get<string>(
      'PUBLIC_DOMAIN',
      'http://localhost:3000',
    );
  }

  async sendVerificationEmail(
    email: string,
    firstName: string,
    verificationCode: string,
  ): Promise<void> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: bold;">
                      Confirm Your Email Address
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 40px;">
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                      Hi ${firstName},
                    </p>
                    <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                      Thank you for signing up! Please use the verification code below to confirm your email address.
                    </p>
                    <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.5;">
                      This code will expire in 2 minutes.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 0 40px 40px 40px;">
                    <div style="display: inline-block; padding: 20px 40px; background-color: #f8f9fa; border: 2px dashed #4F46E5; border-radius: 8px;">
                      <p style="margin: 0; color: #999999; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                        Your verification code
                      </p>
                      <p style="margin: 0; color: #333333; font-size: 36px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        ${verificationCode}
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; color: #999999; font-size: 12px; line-height: 1.5;">
                      If you didn't create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Savey <onboarding@savey.online>',
        to: [email],
        subject: 'Verify your email address',
        html: htmlContent,
      });

      if (error) {
        this.logger.error(
          `Failed to send verification email to ${email}`,
          error,
        );
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      this.logger.log(`Verification email sent to ${email}, ID: ${data?.id}`);
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}`, error);
      throw error;
    }
  }
}
