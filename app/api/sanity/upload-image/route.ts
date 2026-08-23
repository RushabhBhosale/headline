import {
  imageApiErrorResponse,
  parseImageUploadInput,
  requireAutomationAuthorization,
  uploadSanityImage,
} from "@/sanity/lib/imageUpload";

export async function POST(request: Request) {
  try {
    requireAutomationAuthorization(request);
    const input = await parseImageUploadInput(request);
    const asset = await uploadSanityImage(input);

    return Response.json({ success: true, asset }, { status: 201 });
  } catch (error) {
    return imageApiErrorResponse(error);
  }
}
