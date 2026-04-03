import { User } from "@/lib/models/User";
import connectToDatabase from "@/lib/mongodb";

const ADJECTIVES = [
  "Brave", "Calm", "Clever", "Fierce", "Giant", "Jolly", "Mighty", "Quick", 
  "Rapid", "Silent", "Swift", "Wild", "Bold", "Bright", "Dark", "Epic"
];

const NOUNS = [
  "Tiger", "Falcon", "Dragon", "Wolf", "Bear", "Eagle", "Shark", "Panther", 
  "Lion", "Hawk", "Phoenix", "Viper", "Ninja", "Ghost", "Cobra", "Raven"
];

function getRandomElement(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateUniqueNickname(): Promise<string> {
  await connectToDatabase();
  
  let isUnique = false;
  let nickname = "";
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    const adjective = getRandomElement(ADJECTIVES);
    const noun = getRandomElement(NOUNS);
    const number = Math.floor(Math.random() * 1000);
    
    // Format: AdjectiveNoun42
    nickname = `${adjective}${noun}${number}`;
    
    const existingUser = await User.findOne({ anonId: nickname });
    if (!existingUser) {
      isUnique = true;
    }
    
    attempts++;
  }

  // Fallback in rare case 10 attempts fail
  if (!isUnique) {
    nickname = `User${Math.floor(Math.random() * 100000)}${Date.now()}`;
  }

  return nickname;
}