module.exports = {
  guildId: process.env.GUILD_ID,
  prefix: '.',

  botName: 'skid',
  ownerId: '551313949405085696',

  roles: {
    // Main/member roles
    member: '1501348843688562898', // ⌁ Initiate
    verified: '1501354309751935120', // ⟐ Verified
    trusted: '1501354519420993596', // ⟡ Trusted / old Car Provider if reused
    known: '1501354682113589449', // ⟠ Known / old Garage Showcase if reused
    proven: '1501354880156045313', // ⛧ Proven / old Priority Access if reused
    elite: '1501354742687731782', // ♱ Elite / old VIP if reused

    // Paid/status roles
    obsidian: '1501354742687731782', // old VIP role
    ascendant: '1501354880156045313', // old Priority role
    booster: '1501355409137602660', // reuse if wanted

    // Staff roles
    owner: '1501348430113411122', // ✟ Founder
    administrator: '1501348585198063619', // ⟡ Warden
    moderator: '1501348657633558726', // ⟠ Enforcer
    trialModerator: '1501348695872901221', // ⌁ Trial
    staff: '1501488262534004789', // ✟ Staff
    ticketSupport: '1501501747301060669', // ✦ Support

    // Interview roles
    awaitingSupportInterview: '1501617810395107368',
    awaitingAdminInterview: '1501618015190650890',
    awaitingModInterview: '1501618073096945807',

    // Ping roles
    signalsPing: '1501355269475536926', // old Car Drop Ping
    mediaPing: '1501355363507769434', // old Rare Car Ping
    giveawayPing: '1501355409137602660',
    callsPing: '1501355094153625660', // old PC if reused
    eventsPing: '1501355050524606585', // old Xbox if reused

    // Platform roles, if you still want them
    pc: '1501355094153625660',
    xbox: '1501355050524606585',
    playstation: '1501355017423159316',

    // Level roles
    level10: '1501485438932877354',
    level20: '1501485708001677322',
    level40: '1501485728595578960',
    level50: '1501485745376989244',
    level100: '1501485768768753765',
    level1000: '1501485789144416346',

    // Giveaway winner
    giveawayWinner: '1501355409137602660',
  },

  channels: {
    // Start/info
    welcome: '1501355713891663943',
    serverUpdates: '1501355799824306176',
    roles: '1501348035672670278',

    // Main
    general: '1501348086252048605',

    // Media auto-post channels
    pfps: '1501477889353449483',
    banners: '1501937861786861718',
    cars: '1501937949179121725',
    animals: '1501937902270021692', // 
    // Levels
    levels: '1502033587099271219',

    // Tickets/support
    openTicket: '1501356752011137197',
    reportUser: '1501356450545664051',
    staffApplications: '1501598203802423366',
    reportsForum: '1501471777560199198',
    acceptedApplications: '1501619156095729694',

    // Logs
    modLogs: '1501356843509747903',

    // Voice counters
    memberCount: '1501487066502922320',
    onlineMembers: '1501487163051741255',
    staffCount: '1501487225181962350',
    staffOnline: '1501487310099845190',

    // Temp voice system
    clickToCreateVoice: '1501980819659554876',
    channelCommands: '1502034096929505381',

    // Paid/status channels
    obsidian: '1501356613238390936', // old vip-chat if reused
    ascendant: '1501356676736094399', // old priority access if reused
    statusRoles: '1501356696805576824', // old early-access if reused

    // Old/legacy names so older commands do not instantly break
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

  // Legacy support because some files may still use config.gifs.welcome / config.gifs.boost
  gifs: {
    welcome:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282785061699584/Screen_Shot_2026-02-11_at_7.10.59_PM.png?ex=69fc739f&is=69fb221f&hm=16a34745f203d861c61a856e7977e2797505a53fa35754495e89868964bb8f9e&',

    boost:
      'https://cdn.discordapp.com/attachments/1470958936600350721/1471282784504119326/Screen_Shot_2026-02-11_at_7.11.13_PM.png?ex=69fc739e&is=69fb221e&hm=27eb5da925ceaa283397789d446e528122f17055a6a2d001793466929e669fdc&',
  },

  mediaPoster: {
    enabled: true,

    // 10 seconds. Change this later if it spams too much.
    intervalMs: 10000,

    folders: {
      pfps: './assets/pfps',
      banners: './assets/banners',
      cars: './assets/cars',
      animals: './assets/animals',
    },

    // Remote backups. Local folders should be used first.
    remote: {
      pfps: [
        'https://picsum.photos/512/512',
      ],
      banners: [
        'https://picsum.photos/1200/400',
      ],
      cars: [
        'https://source.unsplash.com/900x900/?car,dark',
      ],
      animals: [
        'https://source.unsplash.com/900x900/?animal,dark',
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