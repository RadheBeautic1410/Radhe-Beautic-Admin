import axios from "axios";

interface SendWhatsAppOrderAcceptedProps {
  phoneNumber: string;
  orderId: string;
  customerName: string;
  totalAmount: number;
}

/**
 * Format a phone number for the Meta WhatsApp Business API.
 * The API requires the number to be in international format without any leading '+', 
 * spaces, or special characters.
 * Assumes Indian numbers (country code 91) if a 10-digit number is provided.
 */
export const formatPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  
  if (digits.length === 10) {
    return `91${digits}`;
  }
  
  return digits;
};

/**
 * Sends a WhatsApp message via Meta WhatsApp Business API when a customer's order is accepted.
 */
export const sendWhatsAppOrderAccepted = async ({
  phoneNumber,
  orderId,
  customerName,
  totalAmount,
}: SendWhatsAppOrderAcceptedProps) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "order_accepted";
  const languageCode = process.env.WHATSAPP_TEMPLATE_LANG || "en";

  if (!accessToken || !phoneNumberId) {
    console.warn(
      "[WhatsApp API] Warning: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured in .env. Skipping message."
    );
    return { success: false, reason: "NOT_CONFIGURED" };
  }

  const formattedPhone = formatPhoneNumber(phoneNumber);
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  
  // Format total amount to Indian Rupees format or standard decimal representation
  const formattedAmount = `INR ${totalAmount.toFixed(2)}`;

  // Construct Meta template payload
  const data = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: customerName,
            },
            {
              type: "text",
              text: orderId,
            },
            {
              type: "text",
              text: formattedAmount,
            },
          ],
        },
      ],
    },
  };

  try {
    console.log(`[WhatsApp API] Sending accepted notification for order ${orderId} to ${formattedPhone}...`);
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`[WhatsApp API] Message sent successfully to ${formattedPhone}. Message ID:`, response.data.messages?.[0]?.id);
    return { success: true, data: response.data };
  } catch (error: any) {
    const errorData = error.response?.data || {};
    console.error(
      `[WhatsApp API] Error sending WhatsApp message to ${formattedPhone}:`,
      JSON.stringify(errorData, null, 2) || error.message
    );
    return { 
      success: false, 
      error: errorData.error?.message || error.message || "Failed to send WhatsApp message" 
    };
  }
};
