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

function isStaff(member) {
  return (
    isOwner(member) ||
    isAdmin(member) ||
    hasRole(member, config.roles.moderator) ||
    hasRole(member, config.roles.trialModerator) ||
    hasRole(member, config.roles.staff)
  );
}

function isTicketSupport(member) {
  return isStaff(member) || hasRole(member, config.roles.ticketSupport);
}

function canUseAdmin(member) {
  return isAdmin(member);
}

function canUseMod(member) {
  return isModerator(member);
}

function canUseTicketTools(member) {
  return isTicketSupport(member);
}

function deny(message = 'You do not have permission to use this command.') {
  return {
    content: message,
    ephemeral: true,
  };
}

const adminCommandPermission = PermissionFlagsBits.Administrator;
const modCommandPermission = PermissionFlagsBits.KickMembers;

module.exports = {
  hasRole,
  isOwner,
  isAdmin,
  isModerator,
  isStaff,
  isTicketSupport,
  canUseAdmin,
  canUseMod,
  canUseTicketTools,
  deny,
  adminCommandPermission,
  modCommandPermission,
};