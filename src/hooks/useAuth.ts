import { useState, useEffect } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Session } from '@supabase/supabase-js';
import { moderateText } from '@/src/libs/moderator/textModerator';


export function useAuth() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    async function signUp(
        email: string,
        password: string,
        username: string,
        firstName?: string,
        lastName?: string
    ): Promise<string | null> {
        const usernameCheck = moderateText(username);
        if (!usernameCheck.allowed) {
            return 'This username is not allowed.';
        }

        if (firstName) {
            const fnCheck = moderateText(firstName);
            if (!fnCheck.allowed) return 'First name is not allowed.';
        }
        if (lastName) {
            const lnCheck = moderateText(lastName);
            if (!lnCheck.allowed) return 'Last name is not allowed.';
        }

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return error.message;
        if (!data.user) return 'Something went wrong.';

        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: data.user.id,
                username,
                first_name: firstName?.trim() || null,
                last_name: lastName?.trim() || null,
            });

        return profileError?.message ?? null;
    }

    async function signIn(email: string, password: string): Promise<string | null> {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
    }

    async function signOut(): Promise<void> {
        await supabase.auth.signOut();
    }

    async function updatePassword(newPassword: string): Promise<string | null> {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        return error?.message ?? null;
    }

    async function resetPassword(email: string): Promise<string | null> {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'skatespotapp://reset-password',
        });
        return error?.message ?? null;
    }

    return { session, loading, signUp, signIn, signOut, updatePassword, resetPassword };
}