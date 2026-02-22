import React from 'react';
import { View, Text, Button, Modal, TextInput, Pressable } from 'react-native';
import { Stars } from '@/src/components/Stars';

type Props = {
    visible: boolean;
    pendingCoord: { lat: number; lng: number } | null;
    spotName: string;
    spotDesc: string;
    spotRating: number;
    onChangeName: (v: string) => void;
    onChangeDesc: (v: string) => void;
    onChangeRating: (v: number) => void;
    onCancel: () => void;
    onCreate: () => void;
};

export function CreateSpotModal({
                                    visible, pendingCoord, spotName, spotDesc, spotRating,
                                    onChangeName, onChangeDesc, onChangeRating, onCancel, onCreate,
                                }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                onPress={onCancel}
            >
                <Pressable
                    style={{ backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                    onPress={() => {}}
                >
                    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Create spot</Text>

                    {pendingCoord ? (
                        <Text style={{ marginBottom: 12 }}>
                            {pendingCoord.lat.toFixed(5)}, {pendingCoord.lng.toFixed(5)}
                        </Text>
                    ) : null}

                    <Text style={{ marginBottom: 6 }}>Name</Text>
                    <TextInput
                        value={spotName}
                        onChangeText={onChangeName}
                        placeholder="e.g. Downtown ledges"
                        autoFocus
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 }}
                    />

                    <Text style={{ marginBottom: 6 }}>Description (optional)</Text>
                    <TextInput
                        value={spotDesc}
                        onChangeText={onChangeDesc}
                        placeholder="Surface, obstacles, best time to skate, etc."
                        multiline
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, height: 90, marginBottom: 12 }}
                    />

                    <Text style={{ marginBottom: 6 }}>Rating (optional)</Text>
                    <Stars value={spotRating} onChange={onChangeRating} />

                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                        <Button title="Cancel" onPress={onCancel} />
                        <Button title="Create" onPress={onCreate} />
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}