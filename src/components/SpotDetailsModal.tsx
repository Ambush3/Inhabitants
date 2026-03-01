import React, {useEffect, useRef, useState} from 'react';
import { View, Text, Button, Modal, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Stars } from '@/src/components/Stars';
import { Spot, Review } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';

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
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onEditReview: () => void;
    onDeleteReview: (reviewId: string) => void;
};

export function SpotDetailsModal({
                                     visible, spot, reviews, avgRating, newRating, newComment,
                                     onChangeRating, onChangeComment, onSubmitReview, onClose, onDelete, currentUserId, existingReviewId,
                                     isFavorite, onToggleFavorite, onEditReview, onDeleteReview
                                 }: Props) {

    const scrollRef = useRef<ScrollView>(null);
    const commentInputRef = useRef<TextInput>(null);
    const [scrollEnabled, setScrollEnabled] = useState(false);

    useEffect(() => {
        if (!visible) {
            setScrollEnabled(false);
        }
    }, [visible]);

    function getRatingHint(rating: number): string {
        if (rating === 1) return 'What made this spot difficult or disappointing?';
        if (rating === 2) return 'What could be improved?';
        if (rating === 3) return 'What was average about it?';
        if (rating === 4) return 'What did you enjoy about it?';
        if (rating === 5) return 'What made this spot great?';
        return 'Optional comment';
    }

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => setScrollEnabled(true)}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Pressable
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
                    onPress={onClose}
                >
                    <Pressable
                        style={{ backgroundColor: 'white', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}
                        onPress={() => {}}
                    >
                        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" scrollEnabled={scrollEnabled}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '600', flex: 1 }}>{spot?.name ?? 'Spot'}</Text>
                                <Pressable onPress={onToggleFavorite} style={{ padding: 4 }}>
                                    <Ionicons
                                        name={isFavorite ? 'star' : 'star-outline'}
                                        size={24}
                                        color={isFavorite ? '#f5a623' : '#ccc'}
                                    />
                                </Pressable>
                            </View>

                            {spot?.description ? (
                                <Text style={{ marginTop: 6 }}>{spot.description}</Text>
                            ) : null}

                            {spot?.tags && spot.tags.length > 0 ? (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                    {spot.tags.map(tag => (
                                        <View key={tag} style={{ backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
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
                                    ref={commentInputRef}
                                    value={newComment}
                                    onChangeText={onChangeComment}
                                    placeholder={getRatingHint(newRating)}
                                    multiline
                                    returnKeyType="done"
                                    submitBehavior="blurAndSubmit"
                                    onSubmitEditing={onSubmitReview}
                                    style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, height: 80, marginTop: 10 }}
                                    autoCapitalize="sentences"
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
                                {reviews.map((r) => (
                                    <View key={r.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' }}>
                                        <Text>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                                        {r.comment || r.text ? (
                                            <Text style={{ marginTop: 4 }}>{r.comment ?? r.text}</Text>
                                        ) : null}
                                        <Text style={{ marginTop: 4, opacity: 0.6, fontSize: 12 }}>
                                            {new Date(r.created_at).toLocaleString([], { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {r.user_id === currentUserId ? (
                                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                                                <Pressable onPress={() => {
                                                    scrollRef.current?.scrollTo({ y: 0, animated: true });
                                                }}>
                                                    <Text style={{ fontSize: 12, color: '#007AFF' }}>Edit</Text>
                                                </Pressable>
                                                <Pressable onPress={() => onDeleteReview(r.id)}>
                                                    <Text style={{ fontSize: 12, color: 'red' }}>Delete</Text>
                                                </Pressable>
                                            </View>
                                        ) : null}
                                    </View>
                                ))}
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