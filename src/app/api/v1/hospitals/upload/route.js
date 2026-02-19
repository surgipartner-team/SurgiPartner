import { NextResponse } from 'next/server';
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SESSION_CONFIG } from "@/lib/constants";
import { uploadToCloudinary, deleteFromCloudinary } from "@/lib/cloudinary";

export const runtime = 'nodejs';

// POST - Upload hospital/surgeon image
export async function POST(request) {
    try {
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, SESSION_CONFIG);

        if (!session.user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('image');

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ success: false, error: 'No image file provided' }, { status: 400 });
        }

        const result = await uploadToCloudinary(file, 'hospitals');

        const thumbnailUrl = result.url.replace('/upload/', '/upload/w_200,h_200,c_fill/');

        return NextResponse.json({
            success: true,
            message: 'Image uploaded successfully',
            imageUrl: result.url,
            thumbnailUrl: thumbnailUrl,
            filename: result.public_id
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json({ success: false, error: 'Failed to upload image: ' + error.message }, { status: 500 });
    }
}

// DELETE - Remove an uploaded image
export async function DELETE(request) {
    try {
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, SESSION_CONFIG);

        if (!session.user) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ success: false, error: 'Filename (Public ID) is required' }, { status: 400 });
        }

        // Delete from Cloudinary
        await deleteFromCloudinary(filename, 'image');

        return NextResponse.json({ success: true, message: 'Image deleted successfully' });

    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete image: ' + error.message }, { status: 500 });
    }
}
