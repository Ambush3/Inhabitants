import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { useTheme } from '@/src/context/ThemeContext';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

const hosts: Array<(cfg: AlertConfig) => void> = [];

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const btns = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const top = hosts[hosts.length - 1];
  top?.({ title, message, buttons: btns });
}

export function AlertHost() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [config, setConfig] = useState<AlertConfig | null>(null);

  useEffect(() => {
    const fn = (cfg: AlertConfig) => setConfig(cfg);
    hosts.push(fn);
    return () => {
      const i = hosts.indexOf(fn);
      if (i >= 0) hosts.splice(i, 1);
    };
  }, []);

  function handlePress(btn: AlertButton) {
    setConfig(null);
    btn.onPress?.();
  }

  const buttons = config?.buttons ?? [];
  const isRow = buttons.length <= 2;

  return (
    <Modal
      visible={config !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setConfig(null)}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: 340,
            borderRadius: 16,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.border,
            overflow: 'hidden',
          }}>
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' }}>
              {config?.title}
            </Text>
            {config?.message ? (
              <Text
                style={{
                  fontSize: 14,
                  color: c.subtext,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 20,
                }}>
                {config.message}
              </Text>
            ) : null}
          </View>
          <View style={{ height: 1, backgroundColor: c.border }} />
          <View style={{ flexDirection: isRow ? 'row' : 'column' }}>
            {buttons.map((btn, i) => (
              <React.Fragment key={i}>
                {i > 0 ? (
                  <View
                    style={
                      isRow
                        ? { width: 1, backgroundColor: c.border }
                        : { height: 1, backgroundColor: c.border }
                    }
                  />
                ) : null}
                <Pressable
                  onPress={() => handlePress(btn)}
                  style={{
                    flex: isRow ? 1 : undefined,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: btn.style === 'cancel' ? '700' : '500',
                      color: btn.style === 'destructive' ? c.danger : c.accent,
                    }}>
                    {btn.text}
                  </Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
