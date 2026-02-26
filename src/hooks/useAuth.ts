import { useState, useEffect } from 'react';
import { supabase } from '@/src/libs/supabase';
import { Session } from '@supabase/supabase-js';

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

    async function signUp(email: string, password: string): Promise<string | null> {
        const { error } = await supabase.auth.signUp({ email, password });
        return error?.message ?? null;
    }

    async function signIn(email: string, password: string): Promise<string | null> {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error?.message ?? null;
    }

    async function signOut(): Promise<void> {
        await supabase.auth.signOut();
    }

    return { session, loading, signUp, signIn, signOut };
}