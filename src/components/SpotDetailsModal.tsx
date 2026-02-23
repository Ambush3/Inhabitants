import React from 'react';
import { View, Text, Button, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stars } from '@/src/components/Stars';
import { Spot, Review } from '@/src/types';

type Props = {
    visible: boolean;
    spot: Spot | null;
    reviews: Review[];
    avgRating: number;
    newRating: number;
    newComment: string;
    onChangeRating: (v: number) => void;
    onChangeComment: (v: string) => void;
    onSubmitReview: () => void;
    onClose: () => void;
    onDelete: (spot: Spot) => void;
};

export function SpotDetailsModal({
                                     visible, spot, reviews, avgRating, newRating, newComment,
                                     onChangeRating, onChangeComment, onSubmitReview, onClose, onDelete,
                                 }: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    onPress={onClose}
                >
                    <Pressable
                        style={{ backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' }}
                        onPress={() => {}}
                    >
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <Text style={{ fontSize: 18, fontWeight: '600' }}>{spot?.name ?? 'Spot'}</Text>

                            {spot?.description ? (
                                <Text style={{ marginTop: 6 }}>{spot.description}</Text>
                            ) : null}

                            <View style={{ marginTop: 12 }}>
                                <Text style={{ marginBottom: 6, fontWeight: '600' }}>Rating ({reviews.length})</Text>
                                <Stars value={Math.round(avgRating)} onChange={() => {}} disabled />
                                <Text style={{ marginTop: 6, opacity: 0.7 }}>
                                    {reviews.length === 0 ? 'No reviews yet' : avgRating.toFixed(1) + ' / 5'}
                                </Text>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 6 }}>Add a review</Text>
                                <Stars value={newRating} onChange={onChangeRating} />
                                <TextInput
                                    value={newComment}
                                    onChangeText={onChangeComment}
                                    placeholder="Optional comment"
                                    multiline
                                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, height: 80, marginTop: 10 }}
                                />
                                <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                                    <Button title="Submit review" onPress={onSubmitReview} />
                                </View>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 8 }}>Reviews</Text>
                                <ScrollView>
                                    {reviews.map((r) => (
                                        <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                                            <Text>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                                            <Text style={{ marginTop: 4, opacity: 0.6, fontSize: 12 }}>
                                                {new Date(r.created_at).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Button title="Close" onPress={onClose} />
                                {spot ? <Button title="Delete spot" onPress={() => onDelete(spot)} color="red" /> : null}
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}