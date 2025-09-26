type PrefixedId<Prefix extends string> = `${Prefix}${string}`;

export type userId = PrefixedId<"255.">;
export type suiId = PrefixedId<"400.">;
export type GroupId = PrefixedId<"401.">;
export type ChannelId = PrefixedId<"436.">;

export type GroupMember = {
  sui: suiId;
  name: string;
};
export type User = {
  id: userId;
  name: string;
  sui: suiId;
};

export type Group = {
  id: userId;
  socialId: GroupId;
  name: string;
  members: GroupMember[];
  admins: GroupMember[];
};

export type ChannelMember = {
  id: string;
  name: string;
  externalId: string;
  sui: string;
};

export type Channel = {
  id: string;
  name: string;
  members: ChannelMember[];
};

export type ChannelsResponse = Channel[];
