import Chat from "@models/Chat";
import Message from "@models/Message";
import User from "@models/User";
import { connectToDB } from "@mongodb";
const NodeRSA = require('node-rsa');

// Load RSA keys from .env file or directly from the environment variables
const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;

// Create RSA key instances
const key_private = new NodeRSA(RSA_PRIVATE_KEY);

export const GET = async (req, { params }) => {
  try {
    await connectToDB();

    const { chatId } = params;

    const chat = await Chat.findById(chatId)
      .populate({
        path: "members",
        model: User,
      })
      .populate({
        path: "messages",
        model: Message,
        populate: {
          path: "sender seenBy",
          model: User,
        },
      })
      .exec();

     // Decrypt messages before sending them
     chat.messages.forEach(message => {
      message.text = key_private.decrypt(message.text, 'utf8');
    });

    return new Response(JSON.stringify(chat), { status: 200 });
  } catch (err) {
    console.log(err);
    return new Response("Failed to get chat details", { status: 500 });
  }
};

export const POST = async (req, { params }) => {
  try {
    await connectToDB();

    const { chatId } = params;

    const body = await req.json();

    const { currentUserId } = body;

    await Message.updateMany(
      { chat: chatId },
      { $addToSet: { seenBy: currentUserId } },
      { new: true }
    )
      .populate({
        path: "sender seenBy",
        model: User,
      })
      .exec();

    return new Response("Seen all messages by current user", { status: 200 });
  } catch (err) {
    console.log(err);
    return new Response("Failed to update seen messages", { status: 500 });
  }
};
