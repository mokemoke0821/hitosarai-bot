import { PermissionsBitField } from 'discord.js';

/**
 * Check if the bot has the required permissions in a guild
 * @param guild - The guild to check permissions in
 * @returns Object containing permission check results
 */
export const checkBotPermissions = (guild: any) => {
  if (!guild || !guild.members || !guild.members.me) {
    return {
      hasPermissions: false,
      missingPermissions: ['Unknown - Could not check permissions'],
    };
  }

  const requiredPermissions = [
    PermissionsBitField.Flags.MoveMembers,
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
  ];

  const missingPermissions = requiredPermissions.filter(
    (permission) => !guild.members.me.permissions.has(permission)
  );

  return {
    hasPermissions: missingPermissions.length === 0,
    missingPermissions: missingPermissions.map((p) => 
      Object.keys(PermissionsBitField.Flags).find(
        (key) => PermissionsBitField.Flags[key as keyof typeof PermissionsBitField.Flags] === p
      ) || 'Unknown'
    ),
  };
};

/**
 * Check if a user has the required permissions to use admin commands
 * @param member - The guild member to check
 * @returns Whether the user has admin permissions
 */
export const hasAdminPermissions = (member: any) => {
  if (!member) return false;
  
  return (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member.permissions.has(PermissionsBitField.Flags.MoveMembers)
  );
};
