module.exports = {
  guildId: process.env.GUILD_ID,
  prefix: '.',

  botName: 'skid',
  ownerId: '551313949405085696',

  roles: {
    member: '1501348843688562898',

    verified: '1501354309751935120',
    trusted: '1501354519420993596',
    known: '1501354682113589449',
    proven: '1501354880156045313',
    elite: '1501354742687731782',

    obsidian: '1501354742687731782',
    ascendant: '1501354880156045313',
    booster: '1501355409137602660',

    owner: '1501348430113411122',
    administrator: '1501348585198063619',
    moderator: '1501348657633558726',
    trialModerator: '1501348695872901221',
    staff: '1501488262534004789',
    ticketSupport: '1501501747301060669',

    awaitingSupportInterview: '1501617810395107368',
    awaitingAdminInterview: '1501618015190650890',
    awaitingModInterview: '1501618073096945807',

    signalsPing: '1501355269475536926',
    mediaPing: '1501355363507769434',
    giveawayPing: '1501355409137602660',
    callsPing: '1501355094153625660',
    eventsPing: '1501355050524606585',

    pc: '1501355094153625660',
    xbox: '1501355050524606585',
    playstation: '1501355017423159316',

    level10: '1501485438932877354',
    level20: '1501485708001677322',
    level40: '1501485728595578960',
    level50: '1501485745376989244',
    level100: '1501485768768753765',
    level1000: '1501485789144416346',

    giveawayWinner: '1501355409137602660',
  },

  channels: {
    welcome: '1501355713891663943',
    serverUpdates: '1501355799824306176',
    roles: '1501348035672670278',
    general: '1501348086252048605',

    pfps: '1501477889353449483',
    banners: '1501937861786861718',
    animals: '1501937902270021692',
    cars: '1501937949179121725',

    levels: '1502033587099271219',

    openTicket: '1501356752011137197',
    reportUser: '1501356450545664051',
    staffApplications: '1501598203802423366',
    reportsForum: '1501471777560199198',
    acceptedApplications: '1501619156095729694',

    modLogs: '1501356843509747903',

    memberCount: '1501487066502922320',
    onlineMembers: '1501487163051741255',
    staffCount: '1501487225181962350',
    staffOnline: '1501487310099845190',

    clickToCreateVoice: '1501980819659554876',
    channelCommands: '1502034096929505381',

    obsidian: '1501356613238390936',
    ascendant: '1501356676736094399',
    statusRoles: '1501356696805576824',

    // legacy fallback names
    carDrop: '1501477889353449483',
    marketForum: '1501359314860773438',
    vouches: '1501348288920682586',
    giveaways: '1501356506229116988',
    carMeet: '1501356524700696607',
    vipChat: '1501356613238390936',
    vipCarDrops: '1501356630317469696',
    priorityAccess: '1501356676736094399',
    earlyAccess: '1501356696805576824',
  },

  images: {
    welcome:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282785061699584/Screen_Shot_2026-02-11_at_7.10.59_PM.png?ex=69fc739f&is=69fb221f&hm=16a34745f203d861c61a856e7977e2797505a53fa35754495e89868964bb8f9e&',

    boost:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282784504119326/Screen_Shot_2026-02-11_at_7.11.13_PM.png?ex=69fc739e&is=69fb221e&hm=27eb5da925ceaa283397789d446e528122f17055a6a2d001793466929e669fdc&',

    levelUp:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282960064970974/Screen_Shot_2026-02-11_at_7.09.13_PM.png?ex=69fc73c8&is=69fb2248&hm=312d5565ecbe064ab1baf2fc0666622ff4b0e34163f77cde450749e5b1e1e422&',
  },

  gifs: {
    welcome:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282785061699584/Screen_Shot_2026-02-11_at_7.10.59_PM.png?ex=69fc739f&is=69fb221f&hm=16a34745f203d861c61a856e7977e2797505a53fa35754495e89868964bb8f9e&',

    boost:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282784504119326/Screen_Shot_2026-02-11_at_7.11.13_PM.png?ex=69fc739e&is=69fb221e&hm=27eb5da925ceaa283397789d446e528122f17055a6a2d001793466929e669fdc&',
  },

  mediaPoster: {
    enabled: true,

    // 10 seconds. This is fast. Change to 600000 for 10 minutes.
    intervalMs: 10000,

    folders: {
      pfps: './assets/pfps',
      banners: './assets/banners',
      animals: './assets/animals',
      cars: './assets/cars',
    },

    remote: {
      pfps: [
        'https://picsum.photos/512/512?random=pfp1',
        'https://picsum.photos/512/512?random=pfp2',
        'https://picsum.photos/512/512?random=pfp3',
      ],
      banners: [
        'https://picsum.photos/1200/400?random=banner1',
        'https://picsum.photos/1200/400?random=banner2',
        'https://picsum.photos/1200/400?random=banner3',
      ],
      animals: [
        'https://picsum.photos/900/900?random=animal1',
        'https://picsum.photos/900/900?random=animal2',
        'https://picsum.photos/900/900?random=animal3',
      ],
      cars: [
        'https://picsum.photos/900/900?random=car1',
        'https://picsum.photos/900/900?random=car2',
        'https://picsum.photos/900/900?random=car3',
      ],
    },
  },

  prices: {
    obsidian: {
      monthly: '$5 AUD',
      permanent: '$12 AUD',
    },
    ascendant: {
      monthly: '$3 AUD',
      permanent: '$8 AUD',
    },
    customRole: {
      oneTime: '$5 AUD',
    },
    privateChannel: {
      monthly: '$8 AUD',
      permanent: '$18 AUD',
    },
    customBundle: {
      permanent: '$20 AUD',
    },
  },

  colors: {
    red: 0xff0000,
    darkRed: 0x8b0000,
    blood: 0x5b0f0f,
    grey: 0x6c6c6c,
    dark: 0x111111,
    white: 0xffffff,
    black: 0x000000,
    purple: 0x8a2be2,
    gold: 0xb8860b,
    green: 0x00ff88,
    yellow: 0xffd000,
  },
};