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
    currentUserId: string | null;
    existingReviewId: string | null;
};

export function SpotDetailsModal({
                                     visible, spot, reviews, avgRating, newRating, newComment,
                                     onChangeRating, onChangeComment, onSubmitReview, onClose, onDelete, currentUserId, existingReviewId
                                 }: Props) {

    function getRatingHint(rating: number): string {
        if (rating === 1) return 'What made this spot difficult or disappointing?';
        if (rating === 2) return 'What could be improved?';
        if (rating === 3) return 'What was average about it?';
        if (rating === 4) return 'What did you enjoy about it?';
        if (rating === 5) return 'What made this spot great?';
        return 'Optional comment';
    }

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

                            {spot?.tags && spot.tags.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    {spot.tags.map(tag => (
                                        <View
                                            key={tag}
                                            style={{ backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}
                                        >
                                            <Text style={{ fontSize: 12, opacity: 0.7 }}>#{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}

                            <View style={{ marginTop: 12 }}>
                                <Text style={{ marginBottom: 6, fontWeight: '600' }}>Rating ({reviews.length})</Text>
                                <Stars value={Math.round(avgRating)} onChange={() => {}} disabled />
                                <Text style={{ marginTop: 6, opacity: 0.7 }}>
                                    {reviews.length === 0 ? 'No reviews yet' : avgRating.toFixed(1) + ' / 5'}
                                </Text>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 6 }}>
                                    {existingReviewId ? 'Your review' : 'Add a review'}
                                </Text>
                                <Stars value={newRating} onChange={onChangeRating} />
                                <TextInput
                                    value={newComment}
                                    onChangeText={onChangeComment}
                                    placeholder={getRatingHint(newRating)}
                                    multiline
                                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, height: 80, marginTop: 10 }}
                                />
                                <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                                    <Button
                                        title={existingReviewId ? 'Update review' : 'Submit review'}
                                        onPress={onSubmitReview}
                                    />
                                </View>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <Text style={{ fontWeight: '600', marginBottom: 8 }}>Reviews</Text>
                                <ScrollView>
                                    {reviews.map((r) => (
                                        <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                                            <Text>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                                            {r.comment || r.text ? (
                                                <Text style={{ marginTop: 4 }}>{r.comment ?? r.text}</Text>
                                            ) : null}
                                            <Text style={{ marginTop: 4, opacity: 0.6, fontSize: 12 }}>
                                                {new Date(r.created_at).toLocaleString()}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                            <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Button title="Close" onPress={onClose} />
                                {spot && spot.user_id === currentUserId ? (
                                    <Button title="Delete spot" onPress={() => onDelete(spot)} color="red" />
                                ) : null}
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
}