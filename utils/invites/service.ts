import { supabase } from '../../database/supabase.ts';

export interface InviteSettings {
    guild_id: string;
    enabled: boolean;
    log_channel_id: string | null;
    welcome_channel_id: string | null;
    welcome_enabled: boolean;
    welcome_message: string;
    log_invite_create: boolean;
    log_invite_delete: boolean;
    log_invite_use: boolean;
    show_invite_code: boolean;
    show_inviter: boolean;
    show_invite_uses: boolean;
    show_invite_channel: boolean;
    show_member_count: boolean;
    show_account_age: boolean;
}

export interface StoredInvite {
    guild_id: string;
    code: string;
    inviter_id: string | null;
    channel_id: string | null;
    uses: number;
    max_uses: number;
    max_age: number;
    temporary: boolean;
    created_at: string | null;
    expires_at: string | null;
    deleted_at?: string | null;
}

export const DEFAULT_INVITE_SETTINGS: Omit<InviteSettings, 'guild_id'> = {
    enabled: true,
    log_channel_id: null,
    welcome_channel_id: null,
    welcome_enabled: false,
    welcome_message: 'Bienvenue {membre} sur **{serveur}** !',
    log_invite_create: true,
    log_invite_delete: true,
    log_invite_use: true,
    show_invite_code: true,
    show_inviter: true,
    show_invite_uses: true,
    show_invite_channel: false,
    show_member_count: true,
    show_account_age: false
};

export async function getInviteSettings(guildId: string): Promise<InviteSettings> {
    const { data, error } = await supabase
        .from('guild_invite_settings')
        .select('*')
        .eq('guild_id', guildId)
        .maybeSingle();
    if (error) throw new Error(`Lecture des paramètres d'invitations impossible : ${error.message}`);
    return { guild_id: guildId, ...DEFAULT_INVITE_SETTINGS, ...(data ?? {}) };
}

export async function updateInviteSettings(
    guildId: string,
    patch: Partial<Omit<InviteSettings, 'guild_id'>>
): Promise<void> {
    const { error } = await supabase.from('guild_invite_settings').upsert({
        guild_id: guildId,
        ...patch,
        updated_at: new Date().toISOString()
    }, { onConflict: 'guild_id' });
    if (error) throw new Error(`Mise à jour des invitations impossible : ${error.message}`);
}

export async function saveInvites(invites: StoredInvite[]): Promise<void> {
    if (!invites.length) return;
    const now = new Date().toISOString();
    const { error } = await supabase.from('guild_invites').upsert(
        invites.map(invite => ({ ...invite, deleted_at: null, last_synced_at: now })),
        { onConflict: 'guild_id,code' }
    );
    if (error) throw new Error(`Synchronisation des invitations impossible : ${error.message}`);
}

export async function markInviteDeleted(guildId: string, code: string): Promise<void> {
    const { error } = await supabase
        .from('guild_invites')
        .update({ deleted_at: new Date().toISOString(), last_synced_at: new Date().toISOString() })
        .eq('guild_id', guildId)
        .eq('code', code);
    if (error) throw new Error(`Archivage de l'invitation impossible : ${error.message}`);
}

export async function recordInviteJoin(
    guildId: string,
    userId: string,
    inviteCode: string | null,
    inviterId: string | null
): Promise<void> {
    const { error } = await supabase.from('guild_invite_joins').insert({
        guild_id: guildId,
        user_id: userId,
        invite_code: inviteCode,
        inviter_id: inviterId
    });
    if (error) throw new Error(`Enregistrement de l'arrivée impossible : ${error.message}`);
}

export async function recordInviteLeave(guildId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
        .from('guild_invite_joins')
        .select('id')
        .eq('guild_id', guildId)
        .eq('user_id', userId)
        .is('left_at', null)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(`Recherche de l'arrivée impossible : ${error.message}`);
    if (!data) return;
    const { error: updateError } = await supabase
        .from('guild_invite_joins')
        .update({ left_at: new Date().toISOString() })
        .eq('id', data.id);
    if (updateError) throw new Error(`Enregistrement du départ impossible : ${updateError.message}`);
}

export async function countInviteJoins(guildId: string, code: string): Promise<number> {
    const { count, error } = await supabase
        .from('guild_invite_joins')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('invite_code', code);
    if (error) throw new Error(`Comptage des invitations impossible : ${error.message}`);
    return count ?? 0;
}

export async function getInviteLeaderboard(
    guildId: string,
    limit = 10
): Promise<Array<{ inviter_id: string; invite_count: number }>> {
    const { data, error } = await supabase.rpc('get_guild_invite_leaderboard', {
        p_guild_id: guildId,
        p_limit: limit
    });
    if (error) throw new Error(`Classement des invitations impossible : ${error.message}`);
    return (data ?? []).map((row: { inviter_id: string; invite_count: number | string }) => ({
        inviter_id: row.inviter_id,
        invite_count: Number(row.invite_count)
    }));
}

export async function getInviteMemberStats(
    guildId: string,
    userId: string
): Promise<{ total_invites: number; active_members: number }> {
    const { data, error } = await supabase.rpc('get_guild_invite_member_stats', {
        p_guild_id: guildId,
        p_user_id: userId
    });
    if (error) throw new Error(`Statistiques d'invitations impossibles : ${error.message}`);
    const row = data?.[0];
    return {
        total_invites: Number(row?.total_invites ?? 0),
        active_members: Number(row?.active_members ?? 0)
    };
}
