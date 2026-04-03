import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { User, IUser } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const includeFriends = req.nextUrl.searchParams.get("includeFriends") === "true";

    let query = User.findOne({ email: session.user.email }).select("-email -_id");
    
    if (includeFriends) {
      query = query.populate("friends", "anonId avatar bio");
    }

    const user = await query;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300"
      }
    });
  } catch (error) {
    console.error("Profile GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { anonId, avatar, bio } = body;

    // Validate if anonId is being updated and if it's unique
    if (anonId) {
      if (anonId.trim().length < 3) {
         return NextResponse.json({ error: "anonId must be at least 3 characters" }, { status: 400 });
      }
      // Check if another user has this anonId
      await connectToDatabase();
      const existingAnon = await User.findOne({ anonId });
      if (existingAnon && existingAnon.email !== session.user.email) {
        return NextResponse.json({ error: "anonId is already taken" }, { status: 409 });
      }
    }

    await connectToDatabase();

    const updateData: Partial<IUser> = {};
    if (anonId !== undefined) updateData.anonId = anonId;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (bio !== undefined) updateData.bio = bio;

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-email -_id");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}