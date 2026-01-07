
import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Announcement, User, UserRole } from '../../types';
import { MegaphoneIcon } from "../Icons/Icons";
import { api } from '../../services/api';
import MessageOverlay from "../MessageOverlay/MessageOverlay";
import ConfirmationDialog from "../ConfirmationDialog/ConfirmationDialog";

interface AnnouncementsProps {
    currentUser: User;
    announcements: Announcement[];
    onPost: (newAnnouncement: Announcement) => void;
    onDelete?: (announcementId: string) => void;
    onMarkAsRead?: () => void;
    onLoadMore?: (limit: number, offset: number) => Promise<void>;
    hasMore?: boolean;
    isLoadingMore?: boolean;
}

const AnnouncementForm = memo(({ currentUser, onPost }: { currentUser: User, onPost: (announcement: Announcement) => void }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedImage(e.target.files ? e.target.files[0] : null);
    }, []);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        
        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();
        
        if (!trimmedTitle || !trimmedContent) {
            setMessage({ type: 'error', text: 'Please fill in both title and content' });
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrl: string | undefined;
            if (selectedImage) {
                imageUrl = await fileToBase64(selectedImage);
            }

            const newAnnouncement = await api.createAnnouncement({
                title: trimmedTitle,
                content: trimmedContent,
                imageUrl,
                created_by: currentUser.id,
                author_name: currentUser.name,
                tenant_id: currentUser.tenantId!
            });

            onPost(newAnnouncement);
            
            // Clear form
            setTitle('');
            setContent('');
            if (fileRef.current) fileRef.current.value = '';
            setSelectedImage(null);
            
            setMessage({ type: 'success', text: 'Announcement posted successfully!' });
        } catch (error) {
            console.error('Error posting announcement:', error);
            setMessage({ type: 'error', text: 'Failed to post announcement. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    }, [title, content, selectedImage, currentUser, onPost]);

    return (
        <>
            <div className="lg:col-span-1 bg-white p-4 sm:p-6 rounded-2xl shadow-xl h-fit">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-gradient-to-br from-primary to-pink-600 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-90">
                        <span className="text-2xl">📢</span>
                    </div>
                    <h2 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Post Announcement</h2>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
                        <input 
                            key="announcement-title"
                            type="text" 
                            id="title" 
                            name="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required 
                            placeholder="Enter announcement title"
                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all" 
                        />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
                        <textarea 
                            key="announcement-content"
                            id="content" 
                            name="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={5} 
                            required 
                            placeholder="Write your announcement here..."
                            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="image" className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Image)</label>
                        <div className="flex items-center gap-3">
                            <label htmlFor="image" className="cursor-pointer bg-gradient-to-r from-primary to-pink-600 hover:shadow-lg text-white py-3 px-6 rounded-xl shadow-sm text-sm font-semibold transition-all">
                                <span className="flex items-center gap-2">
                                    <span>📎</span>
                                    Choose File
                                </span>
                            </label>
                            <span className="text-xs text-gray-600 truncate flex-1">
                                {selectedImage ? selectedImage.name : 'No file chosen'}
                            </span>
                            <input 
                                ref={fileRef}
                                key="announcement-image"
                                type="file" 
                                id="image" 
                                accept="image/*"
                                onChange={handleImageChange}
                                className="sr-only"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-primary to-pink-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                        <span>📤</span>
                        {isSubmitting ? 'Posting...' : 'Post Announcement'}
                    </button>
                </form>
            </div>
            <MessageOverlay message={message} onClose={() => setMessage(null)} />
        </>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.currentUser.id === nextProps.currentUser.id &&
        prevProps.currentUser.tenantId === nextProps.currentUser.tenantId &&
        prevProps.onPost === nextProps.onPost
    );
});

const AnnouncementList = memo(({ announcements, currentUser, onDelete, onShowConfirmation, onCloseConfirmation, onLoadMore, hasMore, isLoadingMore }: { 
    announcements: Announcement[], 
    currentUser: User, 
    onDelete?: (id: string) => void,
    onShowConfirmation: (dialog: { isVisible: boolean; message: string; onConfirm: () => void }) => void,
    onCloseConfirmation: () => void,
    onLoadMore?: (limit: number, offset: number) => Promise<void>,
    hasMore?: boolean,
    isLoadingMore?: boolean
}) => {
    const isUnread = useCallback((announcement: Announcement) => {
        return !announcement.readBy || !announcement.readBy.includes(currentUser.id);
    }, [currentUser.id]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
        const performDelete = async () => {
            try {
                await api.deleteAnnouncement(announcementId, currentUser.tenantId!);
                if (onDelete) {
                    onDelete(announcementId);
                }
                setMessage({ type: 'success', text: 'Announcement deleted successfully!' });
                // Close the confirmation dialog
                onCloseConfirmation();
            } catch (error) {
                console.error('Error deleting announcement:', error);
                setMessage({ type: 'error', text: 'Failed to delete announcement. Please try again.' });
                // Close the confirmation dialog even on error
                onCloseConfirmation();
            }
        };

        onShowConfirmation({
            isVisible: true,
            message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
            onConfirm: performDelete
        });
    }, [currentUser.tenantId, onDelete, onShowConfirmation, onCloseConfirmation]);

    // Infinite scroll observer
    useEffect(() => {
        if (!hasMore || !onLoadMore || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore(4, announcements.length);
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            if (loadMoreRef.current) {
                observer.unobserve(loadMoreRef.current);
            }
        };
    }, [hasMore, onLoadMore, isLoadingMore, announcements.length]);

    return (
        <>
            <div className="bg-white p-6 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-primary to-pink-600 rounded-xl shadow-lg backdrop-blur-sm bg-opacity-90">
                        <span className="text-xl">📬</span>
                    </div>
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">Company Announcements</h3>
                </div>
                <div className="space-y-6">
                    {announcements.map(ann => {
                        const bgGradient = isUnread(ann) 
                            ? 'from-blue-50 to-indigo-100/50 border-l-4 border-l-primary' 
                            : 'from-white to-gray-50/50';
                        
                        return (
                        <div key={ann.id} className={`p-5 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all bg-gradient-to-br ${bgGradient}`}>
                            <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-4 space-y-4 lg:space-y-0">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <h4 className="font-bold text-gray-800 text-lg leading-tight break-words">{ann.title}</h4>
                                                {isUnread(ann) && (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-primary to-pink-600 text-white shadow-md">
                                                        ✨ NEW
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed break-words">{ann.content}</p>
                                        </div>
                                        
                                        {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR) && (
                                            <button
                                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                                className="mt-2 sm:mt-0 sm:ml-4 p-2.5 text-red-500 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 rounded-xl transition-all shadow-sm hover:shadow-md flex-shrink-0"
                                                title="Delete Announcement"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    
                                    {ann.image_url && (
                                        <div className="mt-4">
                                            <img 
                                                src={ann.image_url} 
                                                alt="Announcement Attachment" 
                                                className="rounded-xl max-h-64 w-full object-contain border-2 border-gray-200 shadow-md"
                                            />
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-gray-200">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs text-gray-400">
                                            <span className="font-medium">Posted by {ann.author_name || 'System'}</span>
                                            <span>Posted on {new Date(ann.created_at).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    {announcements.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No announcements yet.</p>
                    )}
                    
                    {/* Loading more indicator */}
                    {hasMore && (
                        <div ref={loadMoreRef} className="text-center py-4">
                            {isLoadingMore ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-gray-500">Loading more announcements...</span>
                                </div>
                            ) : (
                                <span className="text-gray-400 text-sm">Scroll to load more</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <MessageOverlay message={message} onClose={() => setMessage(null)} />
        </>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for announcements
    return (
        prevProps.announcements.length === nextProps.announcements.length &&
        prevProps.announcements.every((ann, i) => {
            const prevAnn = prevProps.announcements[i];
            const nextAnn = nextProps.announcements[i];
            return prevAnn?.id === nextAnn?.id && 
                   JSON.stringify(prevAnn?.readBy) === JSON.stringify(nextAnn?.readBy);
        }) &&
        prevProps.currentUser.id === nextProps.currentUser.id &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onCloseConfirmation === nextProps.onCloseConfirmation &&
        prevProps.hasMore === nextProps.hasMore &&
        prevProps.isLoadingMore === nextProps.isLoadingMore
    );
});

const Announcements = memo(({ currentUser, announcements, onPost, onDelete, onMarkAsRead, onLoadMore, hasMore, isLoadingMore }: AnnouncementsProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationDialog, setConfirmationDialog] = useState<{
        isVisible: boolean;
        message: string;
        onConfirm: () => void;
    }>({
        isVisible: false,
        message: '',
        onConfirm: () => {}
    });
    
    const canPost = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

    const hasMarkedAsRead = useRef(false);

    // Mark announcements as read when component mounts (only once)
    useEffect(() => {
        if (onMarkAsRead && announcements.length > 0 && !hasMarkedAsRead.current) {
            hasMarkedAsRead.current = true;
            onMarkAsRead();
        }
    }, []); // Empty dependency array to run only once

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {canPost && <AnnouncementForm currentUser={currentUser} onPost={onPost} />}
                <div className={canPost ? "lg:col-span-2" : "lg:col-span-3"}>
                    <AnnouncementList 
                        announcements={announcements} 
                        currentUser={currentUser} 
                        onDelete={onDelete}
                        onShowConfirmation={setConfirmationDialog}
                        onCloseConfirmation={() => setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} })}
                        onLoadMore={onLoadMore}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                    />
                </div>
            </div>
            <ConfirmationDialog
                isVisible={confirmationDialog.isVisible}
                message={confirmationDialog.message}
                onConfirm={confirmationDialog.onConfirm}
                onCancel={() => setConfirmationDialog({ isVisible: false, message: '', onConfirm: () => {} })}
            />
        </>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
        prevProps.currentUser.id === nextProps.currentUser.id &&
        prevProps.currentUser.role === nextProps.currentUser.role &&
        prevProps.currentUser.tenantId === nextProps.currentUser.tenantId &&
        prevProps.onPost === nextProps.onPost &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onMarkAsRead === nextProps.onMarkAsRead &&
        prevProps.hasMore === nextProps.hasMore &&
        prevProps.isLoadingMore === nextProps.isLoadingMore
    );
});

export default Announcements;
