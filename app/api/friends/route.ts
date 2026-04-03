import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/lib/models/User";
import { Conversation } from "@/lib/models/Conversation";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Load active persistent conversations that contain this user
    const conversations = await Conversation.find({
      participants: currentUser._id,
      leftBy: { $ne: currentUser._id }
    })
      .populate("participants", "anonId avatar bio")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Map responses beautifully for the frontend list
    const data = conversations.map((conv: any) => {
      // Find the "other" person in the array
      let friend = conv.participants.find(
        (p: any) => p._id.toString() !== currentUser._id.toString()
      );
      // Failsafe for self-chat
      if (!friend) friend = conv.participants[0];

      return {
        id: conv._id.toString(),
        friend,
        lastMessage: conv.lastMessage || "Say hello!",
        lastMessageAt: conv.lastMessageAt || conv.createdAt,
        unreadCount: conv.unreadCounts ? (conv.unreadCounts[currentUser._id.toString()] || 0) : 0,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Friends API Get Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}