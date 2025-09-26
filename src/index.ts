import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Group, GroupId, User } from "./types.js";
import { parseName } from "./utils/userUtil.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const messages = JSON.parse(readFileSync(join(__dirname, "messages.json"), "utf-8")) as string[];
const colleagues = JSON.parse(
  readFileSync(join(__dirname, "some-colleagues.json"), "utf-8")
) as string[];
const chatMessages = JSON.parse(
  readFileSync(join(__dirname, "chat-messages.json"), "utf-8")
) as string[];

const API_USERS_URL = "https://elias.dev.sitevision.net/rest-api/populator/users";
const API_GROUPS_URL = "https://elias.dev.sitevision.net/rest-api/populator/groups";
const API_CREATE_USER_URL = "https://elias.dev.sitevision.net/rest-api/populator/user";
const API_TIMELINE_ENTRIES = (id: GroupId) =>
  `https://elias.dev.sitevision.net/rest-api/1/0/${id}/timelineentries`;
const CHANNEL_MESSAGES_URL =
  "https://elias.dev.sitevision.net/rest-api/1/0/436.a84703a1996118e4b117/channelmessages";

const username = "system";
const password = "system";

const SYSTEM_USER_HEADERS = {
  "Content-Type": "application/json",
  Authorization: "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
};

const GET_AUTH_HEADERS = (username: string) => ({
  "Content-Type": "application/json",
  Authorization: "Basic " + Buffer.from(`${username.replaceAll("ø", "o")}:123`).toString("base64"),
});

async function getUsers(): Promise<User[]> {
  try {
    const res = await fetch(API_USERS_URL, {
      method: "GET",
      headers: SYSTEM_USER_HEADERS,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function getGroups(): Promise<Group[]> {
  try {
    const res = await fetch(API_GROUPS_URL, {
      method: "GET",
      headers: SYSTEM_USER_HEADERS,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    return await res.json();
  } catch (err) {
    throw err;
  }
}

async function postMessageToGroup(group: Group, username: string): Promise<void> {
  try {
    const randomMessage = messages[Math.floor(Math.random() * messages.length)] as string;
    const res = await fetch(`${API_TIMELINE_ENTRIES(group.socialId)}`, {
      method: "POST",
      headers: GET_AUTH_HEADERS(username),
      body: JSON.stringify({
        message: randomMessage,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    } else {
      console.log(`Posted message to group: ${group.name} as ${username}`);
    }
  } catch (error) {
    throw error;
  }
}

async function createTimelineEntriesForAllGroups() {
  const groups = await getGroups();
  // const users = await getUsers();

  const preparedMessages = [];
  //! post messages
  for (const group of groups) {
    // Random number of posts to make
    const members = [...group.members, ...group.admins];

    for (const member of members) {
      const postsToMake = Math.floor(Math.random() * 3) + 1; // 1 to 3 posts
      for (let i = 0; i < postsToMake; i++) {
        try {
          const parsedName = parseName(member.name);

          if (!parsedName) {
            console.warn(`Could not parse name for member: ${member.name}`);
            continue;
          }

          preparedMessages.push({ group, member, username: parsedName.username });
        } catch (error) {
          console.error(
            `Error posting message to group: ${group.name} as user: ${member.name}, cause: `,
            JSON.stringify(error)
          );
        }
      }
    }
  }

  // Shuffle prepared messages to simulate realistic chat flow
  const shuffledMessages = preparedMessages.sort(() => Math.random() - 0.5);

  for (const { group, member, username } of shuffledMessages) {
    await postMessageToGroup(group, username);
    // Wait between posts to simulate realistic timing (500ms-1seconds)
    const waitTime = Math.floor(Math.random() * 500) + 500; // 500ms-1seconds
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

async function createNewUsers() {
  for (const colleague of colleagues) {
    try {
      const res = await fetch(API_CREATE_USER_URL, {
        method: "POST",
        headers: SYSTEM_USER_HEADERS,
        body: JSON.stringify({
          name: colleague,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
      } else {
        console.log(`Created user: ${colleague}`);
      }
    } catch (error) {
      console.error(`Error creating user: ${colleague}, cause: `, JSON.stringify(error));
    }
  }
}

async function postMessageToChannel(user: User, message: string): Promise<string | null> {
  try {
    const username = user.name.split(" ")[0].toLowerCase();
    console.log(`Posting channel message as user: ${username}`);

    const res = await fetch(CHANNEL_MESSAGES_URL, {
      method: "POST",
      headers: GET_AUTH_HEADERS(username),
      body: JSON.stringify({
        message: message,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    const response = await res.json();
    console.log(`Posted channel message as user: ${user.name} - Message ID: ${response.id}`);
    return response.id;
  } catch (error) {
    console.error(`Failed to post channel message for user: ${user.name}`, error);
    return null;
  }
}

async function likeMessage(messageId: string, user: User): Promise<void> {
  try {
    const username = user.name.split(" ")[0].toLowerCase();
    const likeUrl = `https://elias.dev.sitevision.net/rest-api/1/0/${messageId}/likes`;
    console.log(likeUrl);

    const res = await fetch(likeUrl, {
      method: "POST",
      headers: GET_AUTH_HEADERS(username),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    console.log(`User ${user.name} liked message ${messageId}`);
  } catch (error) {
    console.error(`Failed to like message ${messageId} as user ${user.name}:`, error);
  }
}

async function replyToMessage(messageId: string, user: User, replyMessage: string): Promise<void> {
  try {
    const username = user.name.split(" ")[0].toLowerCase();
    const replyUrl = `https://elias.dev.sitevision.net/rest-api/1/0/${messageId}/messagereplies`;

    const res = await fetch(replyUrl, {
      method: "POST",
      headers: GET_AUTH_HEADERS(username),
      body: JSON.stringify({
        message: replyMessage,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    console.log(`User ${user.name} replied to message ${messageId}`);
  } catch (error) {
    console.error(`Failed to reply to message ${messageId} as user ${user.name}:`, error);
  }
}

async function createChannelMessagesWithInteractions(): Promise<void> {
  try {
    const users = await getUsers();
    const allMessageIds: string[] = [];

    // Create a pool of messages each user wants to post (1-3 per user)
    const userMessageQueue: { user: User; message: string }[] = [];

    for (const user of users.slice(0, 2)) {
      const messagesToPost = Math.floor(Math.random() * 3) + 1; // 1 to 3 messages

      for (let i = 0; i < messagesToPost; i++) {
        const randomMessage = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        userMessageQueue.push({ user, message: randomMessage });
      }
    }

    // Shuffle the message queue to simulate realistic chat flow
    const shuffledQueue = userMessageQueue.sort(() => Math.random() - 0.5);

    // Step 1: Post messages one at a time from different users in random order
    for (const { user, message } of shuffledQueue) {
      const messageId = await postMessageToChannel(user, message);

      if (messageId) {
        allMessageIds.push(messageId);
      }

      // Wait between posts to simulate realistic timing (2-8 seconds)
      const waitTime = Math.floor(Math.random() * 1000) + 500; // 2-8 seconds
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    console.log(`Posted ${allMessageIds.length} channel messages`);

    // Step 2: Add likes to each message (2 to all users)
    for (const messageId of allMessageIds) {
      const minLikes = 2;
      const maxLikes = users.length;
      const likesToAdd = Math.floor(Math.random() * (maxLikes - minLikes + 1)) + minLikes;

      // Shuffle users array and take the first 'likesToAdd' users
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      const usersToLike = shuffledUsers.slice(0, likesToAdd);

      for (const user of usersToLike) {
        await likeMessage(messageId, user);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log(`Added likes to all messages`);

    // Step 3: Add replies to each message (1-5 replies)
    for (const messageId of allMessageIds) {
      const repliesToAdd = Math.floor(Math.random() * 5) + 1; // 1 to 5 replies

      // Shuffle users and take random users for replies
      const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
      const usersToReply = shuffledUsers.slice(0, repliesToAdd);

      for (const user of usersToReply) {
        const randomReply = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        await replyToMessage(messageId, user, randomReply);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log(`Added replies to all messages`);
    console.log(`✅ Channel message creation complete!`);
  } catch (error) {
    console.error("Error creating channel messages with interactions:", error);
  }
}

(async () => {
  try {
    await createTimelineEntriesForAllGroups();
    // await createNewUsers();
    // await createChannelMessagesWithInteractions();
  } catch (error) {
    console.error("Error fetching users:", error);
  }
})();
