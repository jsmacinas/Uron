import Chat from "@models/Chat";
import Message from "@models/Message";
import User from "@models/User";
import { connectToDB } from "@mongodb";
const NodeRSA = require('node-rsa');

export const GET = async (req, { params }) => {
  try {
    await connectToDB();

    // Load RSA keys from .env file or directly from the environment variables
    const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;

    // Create RSA key instances
    const key_private = new NodeRSA(RSA_PRIVATE_KEY);

    const { userId, query } = params;

    const searchedChat = await Chat.find({
      members: userId,
      name: { $regex: query, $options: "i" },
    })
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
      searchedChat.forEach(chat => {
      chat.messages.forEach(message => {
        message.text = key_private.decrypt(message.text, 'utf8');
      });
    });

    return new Response(JSON.stringify(searchedChat), { status: 200 });
  } catch (err) {
    console.log(err);
    return new Response("Failed to search chat", { status: 500 });
  }
};
