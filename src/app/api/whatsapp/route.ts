import { NextRequest, NextResponse } from "next/server";
import FormData from "form-data";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
      console.error("WHATSAPP_ACCESS_TOKEN is not set");
      return NextResponse.json(
        { success: false, error: "WhatsApp access token not configured" },
        { status: 500 }
      );
    }

    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error("WHATSAPP_PHONE_NUMBER_ID is not set");
      return NextResponse.json(
        { success: false, error: "WhatsApp phone number ID not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const type = formData.get("type"); // 'text', 'media', or 'template'
    const to: string = formData.get("to") as string;
    const message: string = formData.get("message") as string;
    const templateName: string = formData.get("templateName") as string;
    const templateLanguage: string = formData.get("templateLanguage") as string || "en_US";

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Validate phone number format (should be in E.164 format: +1234567890)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: "Phone number must be in E.164 format (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    console.log("Sending WhatsApp message to:", to);
    console.log("Message type:", type);

    // For text and media messages, warn about 24-hour window
    if (type === "text" || type === "media") {
      console.log("⚠️  WARNING: Text/media messages only work within 24-hour window");
      console.log("⚠️  If message is not received, user may not have messaged you recently");
      console.log("⚠️  Consider using template messages for users outside 24-hour window");
    }

    let result;

    if (type === "text") {
      // Handle text message
      if (!message) {
        return NextResponse.json(
          { success: false, error: "Message is required for text type" },
          { status: 400 }
        );
      }

      result = await sendTextMessage(to, message);
    } else if (type === "media") {
      // Handle media message
      const file = formData.get("file");
      const caption: string = formData.get("caption") as string;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "File is required for media type" },
          { status: 400 }
        );
      }

      result = await sendMediaMessage(to, file, caption);
    } else if (type === "template") {
      // Handle template message
      if (!templateName) {
        return NextResponse.json(
          { success: false, error: "Template name is required for template type" },
          { status: 400 }
        );
      }

      result = await sendTemplateMessage(to, templateName, templateLanguage);
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Use "text", "media", or "template"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      type: type,
    });
  } catch (error: any) {
    console.error("WhatsApp API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to send text messages
async function sendTextMessage(to: string, message: string) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: {
          body: message,
        },
      }),
    }
  );

  const result = await response.json();

  console.log("WhatsApp API Response:", JSON.stringify(result, null, 2));
  console.log("Response Status:", response.status);

  if (!response.ok) {
    console.error("WhatsApp API Error:", result);
    throw new Error(result.error?.message || `Failed to send text message. Status: ${response.status}`);
  }

  if (!result.messages || !result.messages[0]) {
    console.error("No message ID in response:", result);
    throw new Error("No message ID returned from WhatsApp API");
  }

  return { messageId: result.messages[0].id };
}

// Helper function to send template messages
async function sendTemplateMessage(to: string, templateName: string, languageCode: string) {
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode
          }
        }
      }),
    }
  );

  const result = await response.json();

  console.log("WhatsApp Template API Response:", JSON.stringify(result, null, 2));
  console.log("Template Response Status:", response.status);

  if (!response.ok) {
    console.error("WhatsApp Template API Error:", result);
    throw new Error(result.error?.message || `Failed to send template message. Status: ${response.status}`);
  }

  if (!result.messages || !result.messages[0]) {
    console.error("No message ID in template response:", result);
    throw new Error("No message ID returned from WhatsApp Template API");
  }

  return { messageId: result.messages[0].id };
}

// Helper function to upload and send media messages
async function sendMediaMessage(to: string, file: any, caption: string) {
  // Step 1: Upload media to WhatsApp
  const mediaId = await uploadMedia(file);

  // Step 2: Determine media type based on file type
  const mediaType = getMediaType(file.type);

  // Step 3: Send media message
  let mediaObject: any = { id: mediaId };

  if (caption) mediaObject.caption = caption;
  if (file.name && mediaType === "document") {
    mediaObject.filename = file.name;
  }

  const response = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: mediaType,
        [mediaType]: mediaObject,
      }),
    }
  );

  const result = await response.json();

  console.log("WhatsApp Media API Response:", JSON.stringify(result, null, 2));
  console.log("Media Response Status:", response.status);

  if (!response.ok) {
    console.error("WhatsApp Media API Error:", result);
    throw new Error(result.error?.message || `Failed to send media message. Status: ${response.status}`);
  }

  if (!result.messages || !result.messages[0]) {
    console.error("No message ID in media response:", result);
    throw new Error("No message ID returned from WhatsApp Media API");
  }

  return { messageId: result.messages[0].id };
}

async function uploadMedia(file: any) {
  try {
    // Get file data as buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Use fetch with multipart/form-data
    const boundary = `----formdata-${Date.now()}`;
    
    // Manually construct multipart form data
    const formDataParts = [];
    
    // Add messaging_product field
    formDataParts.push(`--${boundary}`);
    formDataParts.push(`Content-Disposition: form-data; name="messaging_product"`);
    formDataParts.push('');
    formDataParts.push('whatsapp');
    
    // Add type field
    formDataParts.push(`--${boundary}`);
    formDataParts.push(`Content-Disposition: form-data; name="type"`);
    formDataParts.push('');
    formDataParts.push(file.type);
    
    // Add file field
    formDataParts.push(`--${boundary}`);
    formDataParts.push(`Content-Disposition: form-data; name="file"; filename="${file.name}"`);
    formDataParts.push(`Content-Type: ${file.type}`);
    formDataParts.push('');
    
    // Create the complete body
    const textPart = formDataParts.join('\r\n') + '\r\n';
    const endBoundary = `\r\n--${boundary}--\r\n`;
    
    // Combine text and binary data
    const textBuffer = Buffer.from(textPart, 'utf8');
    const endBuffer = Buffer.from(endBoundary, 'utf8');
    const body = Buffer.concat([textBuffer, fileBuffer, endBuffer]);

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      }
    );

    const result = await response.json();
    
    console.log("Media upload response:", JSON.stringify(result, null, 2));
    console.log("Media upload status:", response.status);

    if (!response.ok) {
      console.error("Media upload error:", result);
      throw new Error(result.error?.message || "Failed to upload media");
    }

    return result.id;
  } catch (error: any) {
    console.error("Upload media error:", error);
    throw new Error(`Media upload failed: ${error.message}`);
  }
}


function getMediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "image";
  } else if (mimeType.startsWith("video/")) {
    return "video";
  } else if (mimeType.startsWith("audio/")) {
    return "audio";
  } else {
    return "document";
  }
}

// GET method for API info
export async function GET() {
  return NextResponse.json({
    message: "WhatsApp Unified API",
    endpoints: {
      POST: {
        description: "Send text, media, or template messages",
        parameters: {
          type: "text, media, or template",
          to: "recipient phone number with country code (E.164 format)",
          message: "required for text type",
          file: "required for media type",
          caption: "optional for media type",
          templateName: "required for template type (e.g., hello_world)",
          templateLanguage: "optional for template type (default: en_US)",
        },
      },
    },
    supportedMediaTypes: [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/msword",
      "video/mp4",
      "audio/mp3",
    ],
  });
}
