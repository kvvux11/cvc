const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

function hasRole(member, roleId) {
  return member?.roles?.cache?.has(roleId);
}

function isOwner(member) {
  return hasRole(member, config.roles.owner);
}

function isAdmin(member) {
  return isOwner(member) || hasRole(member, config.roles.administrator);
}

function isModerator(member) {
  return isAdmin(member) || hasRole(member, config.roles.moderator);
}

function isTrialModerator(member) {
  return (
    isModerator(member) ||
    hasRole(member, config.roles.trialModerator)
  );
}

// General staff access ONLY.
// Do not use this for ban/kick/admin commands.
function isStaff(member) {
  return (
    isOwner(member) ||
    hasRole(member, config.roles.administrator) ||
    hasRole(member, config.roles.moderator) ||
    hasRole(member, config.roles.trialModerator) ||
    hasRole(member, config.roles.staff)
  );
}

function isTicketSupport(member) {
  return isStaff(member) || hasRole(member, config.roles.ticketSupport);
}

function canUseOwner(member) {
  return isOwner(member);
}

// Owner/Admin only
function canUseAdmin(member) {
  return isAdmin(member);
}

// Owner/Admin/Moderator only
// Trial Moderator does NOT pass this.
function canUseMod(member) {
  return isModerator(member);
}

// Owner/Admin/Moderator/Trial Moderator
// For smaller actions only, like timeout/clear.
function canUseTrialMod(member) {
  return isTrialModerator(member);
}

// Staff + Ticket Support can handle ticket buttons.
function canUseTicketTools(member) {
  return isTicketSupport(member);
}

function deny(message = 'You do not have permission to use this command.') {
  return {
    content: message,
    ephemeral: true,
  };
}

const ownerCommandPermission = PermissionFlagsBits.Administrator;
const adminCommandPermission = PermissionFlagsBits.Administrator;
const modCommandPermission = PermissionFlagsBits.KickMembers;
const trialModCommandPermission = PermissionFlagsBits.ModerateMembers;
const manageMessagesPermission = PermissionFlagsBits.ManageMessages;

module.exports = {
  hasRole,
  isOwner,
  isAdmin,
  isModerator,
  isTrialModerator,
  isStaff,
  isTicketSupport,
  canUseOwner,
  canUseAdmin,
  canUseMod,
  canUseTrialMod,
  canUseTicketTools,
  deny,
  ownerCommandPermission,
  adminCommandPermission,
  modCommandPermission,
  trialModCommandPermission,
  manageMessagesPermission,
};