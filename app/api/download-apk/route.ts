import { appwriteConfig } from '@/lib/appwrite';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');
  const version = searchParams.get('version');

  if (!fileId || !version) {
    return new Response('Missing fileId or version', { status: 400 });
  }

  // Construct Appwrite download URL
  const downloadUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/download?project=${appwriteConfig.projectId}`;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      return new Response(`Failed to fetch file from Appwrite: ${response.statusText}`, { status: response.status });
    }

    const filename = `mindsafe-v${version}.apk`;

    // Return the response stream with proper content disposition and type for APK
    return new Response(response.body, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Error proxying APK download:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
