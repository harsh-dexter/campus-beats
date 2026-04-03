import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { generateUniqueNickname } from "@/lib/utils/nickname";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const newAnonId = await generateUniqueNickname();

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { anonId: newAnonId } },
      { new: true, runValidators: true }
    ).select("-email -_id");

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Nickname Expose Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}