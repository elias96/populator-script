import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Group, GroupId, User, Channel, ChannelMember, ChannelsResponse } from "./types.js";
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
const chatReplyMessages = JSON.parse(
  readFileSync(join(__dirname, "chat-reply-messages.json"), "utf-8")
) as string[];

const API_USERS_URL = "https://elias.dev.sitevision.net/rest-api/populator/users";
const API_GROUPS_URL = "https://elias.dev.sitevision.net/rest-api/populator/groups";
const API_CHANNELS_URL = "https://elias.dev.sitevision.net/rest-api/populator/channels";
const API_CREATE_USER_URL = "https://elias.dev.sitevision.net/rest-api/populator/user";
const API_TIMELINE_ENTRIES = (id: GroupId) =>
  `https://elias.dev.sitevision.net/rest-api/1/0/${id}/timelineentries`;
const CHANNEL_MESSAGES_URL = (channelId: string) =>
  `https://elias.dev.sitevision.net/rest-api/1/0/${channelId}/channelmessages`;

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

async function getChannels(): Promise<Channel[]> {
  try {
    const res = await fetch(API_CHANNELS_URL, {
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

async function postMessageToChannel(
  channelId: string,
  member: ChannelMember,
  message: string
): Promise<string | null> {
  try {
    const username = member.externalId;
    console.log(`Posting channel message as user: ${username}`);

    const res = await fetch(CHANNEL_MESSAGES_URL(channelId), {
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
    console.log(`Posted channel message as user: ${member.name} - Message ID: ${response.id}`);
    return response.id;
  } catch (error) {
    console.error(`Failed to post channel message for user: ${member.name}`, error);
    return null;
  }
}

async function replyToMessage(
  messageId: string,
  member: ChannelMember,
  replyMessage: string
): Promise<void> {
  try {
    const username = member.externalId;
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

    console.log(`User ${member.name} replied to message ${messageId}`);
  } catch (error) {
    console.error(`Failed to reply to message ${messageId} as user ${member.name}:`, error);
  }
}

async function createChannelMessagesWithInteractions(): Promise<void> {
  try {
    const users = await getUsers();
    const channels = await getChannels();
    const allMessageIds: string[] = [];

    console.log(
      `Found ${channels.length} channels with a total of ${channels.reduce(
        (sum, ch) => sum + ch.members.length,
        0
      )} members`
    );

    // Track recently used messages and replies to avoid repetition
    const recentMessages: string[] = []; // Keep track of last 5 messages
    const usedRepliesPerMessage: Map<string, Set<string>> = new Map(); // Track all replies per message

    // Helper function to get a unique message
    const getUniqueMessage = (): string => {
      let attempts = 0;
      let selectedMessage: string;

      do {
        selectedMessage = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        attempts++;
      } while (recentMessages.includes(selectedMessage) && attempts < 10);

      // Update recent messages (keep only last 5)
      recentMessages.push(selectedMessage);
      if (recentMessages.length > 5) {
        recentMessages.shift();
      }

      return selectedMessage;
    };

    // Helper function to get a unique reply for a specific message
    const getUniqueReply = (messageId: string): string => {
      if (!usedRepliesPerMessage.has(messageId)) {
        usedRepliesPerMessage.set(messageId, new Set());
      }

      const usedReplies = usedRepliesPerMessage.get(messageId)!;
      let attempts = 0;
      let selectedReply: string;

      do {
        selectedReply = chatReplyMessages[Math.floor(Math.random() * chatReplyMessages.length)];
        attempts++;
      } while (usedReplies.has(selectedReply) && attempts < 20);

      // Track this reply as used for this message
      usedReplies.add(selectedReply);

      return selectedReply;
    };

    // Create a pool of messages for each channel member
    const memberMessageQueue: {
      channelId: string;
      channelName: string;
      member: ChannelMember;
      message: string;
    }[] = [];

    for (const channel of channels) {
      for (const member of channel.members) {
        const messagesToPost = Math.floor(Math.random() * 3) + 1; // 1 to 3 messages per member

        for (let i = 0; i < messagesToPost; i++) {
          const uniqueMessage = getUniqueMessage();
          memberMessageQueue.push({
            channelId: channel.id,
            channelName: channel.name,
            member,
            message: uniqueMessage,
          });
        }
      }
    }

    // Group messages by channel for concurrent processing
    const messagesByChannel = new Map<string, typeof memberMessageQueue>();

    for (const messageItem of memberMessageQueue) {
      if (!messagesByChannel.has(messageItem.channelId)) {
        messagesByChannel.set(messageItem.channelId, []);
      }
      messagesByChannel.get(messageItem.channelId)!.push(messageItem);
    }

    // Shuffle messages within each channel
    for (const [channelId, messages] of messagesByChannel) {
      messagesByChannel.set(
        channelId,
        messages.sort(() => Math.random() - 0.5)
      );
    }

    console.log(`Prepared messages for ${channels.length} channels - processing concurrently`);

    // Get all members for replies upfront
    const allMembers = channels.flatMap((ch) => ch.members);

    // Process each channel concurrently
    const channelPromises = Array.from(messagesByChannel.entries()).map(
      async ([channelId, messages]) => {
        const channel = channels.find((ch) => ch.id === channelId)!;
        const channelMessageIds: string[] = [];

        console.log(
          `🚀 Starting concurrent processing for channel: ${channel.name} (${messages.length} messages)`
        );

        for (const { member, message } of messages) {
          const messageId = await postMessageToChannel(channelId, member, message);

          if (messageId) {
            channelMessageIds.push(messageId);
            allMessageIds.push(messageId);
            console.log(`📝 Posted message to '${channel.name}' as ${member.name}`);

            // Immediately add replies to this message (0-8 replies, sometimes no replies)
            const repliesToAdd = Math.floor(Math.random() * 9); // 0 to 8 replies

            if (repliesToAdd > 0) {
              // Get random members for replies (excluding the original poster)
              const availableRepliers = allMembers.filter((m) => m.id !== member.id);
              const shuffledRepliers = [...availableRepliers].sort(() => Math.random() - 0.5);
              const membersToReply = shuffledRepliers.slice(0, repliesToAdd);

              // Process replies concurrently for this message
              const replyPromises = membersToReply.map(async (replier, index) => {
                const uniqueReply = getUniqueReply(messageId);

                // Stagger reply delays to simulate realistic response timing (0.5-1.5 seconds + index offset)
                const replyDelay = Math.floor(Math.random() * 1000) + 500 + index * 200;
                await new Promise((resolve) => setTimeout(resolve, replyDelay));

                await replyToMessage(messageId, replier, uniqueReply);
                console.log(`  └─ ${replier.name} replied to message in '${channel.name}'`);
              });

              // Wait for all replies to complete for this message
              await Promise.all(replyPromises);
            }
          }

          // Wait between posts within this channel (1-2 seconds)
          const waitTime = Math.floor(Math.random() * 1000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }

        console.log(`✅ Completed channel: ${channel.name} (${channelMessageIds.length} messages)`);
        return channelMessageIds.length;
      }
    );

    // Wait for all channels to complete
    const results = await Promise.all(channelPromises);

    const totalMessages = results.reduce((sum, count) => sum + count, 0);
    console.log(
      `🎉 All channels completed concurrently! Posted ${totalMessages} messages across ${channels.length} channels with immediate replies.`
    );
  } catch (error) {
    console.error("Error creating channel messages with interactions:", error);
  }
}

(async () => {
  try {
    // await createTimelineEntriesForAllGroups();
    // await createNewUsers();
    await createChannelMessagesWithInteractions();
  } catch (error) {
    console.error("Error fetching users:", error);
  }
})();
