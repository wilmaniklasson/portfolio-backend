import client from "../db/mongoClient.js";

export async function logChat(question, answer) {
  try {
    const db = client.db("chatlogs"); 
    const collection = db.collection("chatMessages"); 

    await collection.insertOne({
      question,
      answer,
      timestamp: new Date(),
    });

    console.log("Chat loggat i MongoDB");
  } catch (error) {
    console.error("Fel vid loggning i DB:", error);
  }
}
