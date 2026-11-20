// Sending SMS. The provider is chosen with SMS_PROVIDER.

export interface SmsProvider {
  readonly name: string;
  send(phone: string, message: string): Promise<void>;
}

/** Default: writes the message to the server log. No SMS leaves the server. */
export function consoleSms(log: (msg: string) => void = (m) => console.log(m)): SmsProvider {
  return {
    name: "console",
    async send(phone, message) {
      log(`[sms:console] to ${phone}: ${message}`);
    },
  };
}

export function createSmsProvider(name: string): SmsProvider {
  switch (name) {
    case "console":
      return consoleSms();
    // TODO(sms): add a real provider once one is chosen (for example a local
    // aggregator or Twilio). It should read its credentials from env, e.g.
    // SMS_API_KEY and SMS_SENDER_ID, and implement send() above.
    default:
      throw new Error(`SMS_PROVIDER "${name}" isn't implemented yet. Use "console" for now.`);
  }
}
