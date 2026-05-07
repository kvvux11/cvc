const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

function hasRole(member, roleId) {
  return Boolean(roleId && member?.roles?.cache?.has(roleId));
}

function isUserOwner(userOrMember) {
  const id = userOrMember?.id || userOrMember?.user?.id;
  return id === config.ownerId;
}

function isFounder(member) {
  return isUserOwner(member) || hasRole(member, config.roles.owner);
}

function isWarden(member) {
  return isFounder(member) || hasRole(member, config.roles.warden);
}

function isEnforcer(member) {
  return isWarden(member) || hasRole(member, config.roles.enforcer);
}

function isTrial(member) {
  return isEnforcer(member) || hasRole(member, config.roles.trial);
}

function isStaff(member) {
  return (
    isFounder(member) ||
    hasRole(member, config.roles.warden) ||
    hasRole(member, config.roles.enforcer) ||
    hasRole(member, config.roles.trial) ||
    hasRole(member, config.roles.staff)
  );
}

function isSupport(member) {
  return isStaff(member) || hasRole(member, config.roles.support);
}

function canUseOwner(member) {
  return isFounder(member);
}

function canUseAdmin(member) {
  return isWarden(member);
}

function canUseMod(member) {
  return isEnforcer(member);
}

function canUseTrialMod(member) {
  return isTrial(member);
}

function canUseTicketTools(member) {
  return isSupport(member);
}

function deny(message = 'You do not have permission to use this.') {
  return { content: message, ephemeral: true };
}

module.exports = {
  hasRole,
  isUserOwner,
  isFounder,
  isWarden,
  isEnforcer,
  isTrial,
  isStaff,
  isSupport,
  canUseOwner,
  canUseAdmin,
  canUseMod,
  canUseTrialMod,
  canUseTicketTools,
  deny,

  ownerCommandPermission: PermissionFlagsBits.Administrator,
  adminCommandPermission: PermissionFlagsBits.Administrator,
  modCommandPermission: PermissionFlagsBits.KickMembers,
  trialModCommandPermission: PermissionFlagsBits.ModerateMembers,
  manageMessagesPermission: PermissionFlagsBits.ManageMessages,
};
