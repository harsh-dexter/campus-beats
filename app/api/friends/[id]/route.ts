import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import { PersistentMessage } from "@/lib/models/PersistentMessage";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const conversationId = id;
    if (!conversationId) return NextResponse.json({ error: "No Conversation ID" }, { status: 400 });

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: currentUser._id
    }).populate("participants", "anonId avatar");

    if (!conversation) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    // Fetch messages
    const messages = await PersistentMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    // Map the friend details
    let friend = conversation.participants.find((p: any) => p._id.toString() !== currentUser._id.toString());
    if(!friend) friend = conversation.participants[0];

    const isEnded = conversation.leftBy?.length > 0;

    return NextResponse.json({
      metadata: { friend, currentUserId: currentUser._id, isEnded },
      messages
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text } = await req.json();
    if (!text || !text.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Ensure membership
    const conversation = await Conversation.findOne({
      _id: id,
      participants: currentUser._id
    });
    if (!conversation) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (conversation.leftBy && conversation.leftBy.length > 0) {
      return NextResponse.json({ error: "Chat has ended" }, { status: 403 });
    }

    const newMsg = await PersistentMessage.create({
      conversationId: conversation._id,
      senderId: currentUser._id,
      text
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return NextResponse.json(newMsg);
  } catch (e) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    
    // Ensure membership
    const conversation = await Conversation.findOne({
      _id: id,
      participants: currentUser._id
    });
    if (!conversation) return NextResponse.json({ error: "Not Found" }, { status: 404 });

    // Identify the friend to remove from each other's friend arrays
    const friendId = conversation.participants.find((p: any) => p.toString() !== currentUser._id.toString());

    if (friendId) {
      // Remove friend from currentUser's friends array
      await User.findByIdAndUpdate(currentUser._id, { $pull: { friends: friendId } });
      // Remove currentUser from friend's friends array
      await User.findByIdAndUpdate(friendId, { $pull: { friends: currentUser._id } });
    }

    // Mark as left by this user
    const updatedConv = await Conversation.findByIdAndUpdate(
      id, 
      { $addToSet: { leftBy: currentUser._id } },
      { returnDocument: 'after', new: true }
    );

    // If everyone left, delete the conversation permanently
    if (updatedConv) {
      const leftCount = updatedConv.leftBy ? updatedConv.leftBy.length : 0;
      const participantCount = updatedConv.participants ? updatedConv.participants.length : 0;
      
      if (leftCount >= participantCount) {
        await Conversation.findByIdAndDelete(id);
        await PersistentMessage.deleteMany({ conversationId: id });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete Friend Error:", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}