
import React, { useState, useEffect } from 'react';
import { Announcement, User, UserRole } from '../types';
import { MegaphoneIcon } from './Icons';
import Notification from './Notification';

interface AnnouncementsProps {
    currentUser: User;
    announcements: Announcement[];
    onPost: (newAnnouncement: Announcement) => void;
    onMarkAsRead: () => void;
}

const Announcements = ({ currentUser, announcements, onPost, onMarkAsRead }: AnnouncementsProps) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    
    const canPost = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.HR;

    useEffect(() => {
        onMarkAsRead();
    }, [onMarkAsRead]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let imageUrl: string | undefined = undefined;
        if (selectedImage) {
            // Create a local URL for the uploaded image (Simulation)
            imageUrl = URL.createObjectURL(selectedImage);
        }

        const newAnnouncement: Announcement = {
            id: `ann-${Date.now()}`,
            title,
            content,
            author: currentUser.name,
            date: new Date(),
            isRead: false, // New announcements are unread by default
            imageUrl: imageUrl
        };
        onPost(newAnnouncement);
        
        // Reset form
        setTitle('');
        setContent('');
        setSelectedImage(null);
        setNotification('Announcement posted successfully!');
    };

    const ManagerView = () => (
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-lg h-fit">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={5} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                </div>
                <div>
                    <label htmlFor="image" className="block text-sm font-medium text-gray-700">Attachment (Image)</label>
                    <div className="mt-1 flex items-center">
                        <label htmlFor="image" className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                            Choose File
                        </label>
                        <span className="ml-3 text-xs text-gray-500 truncate">
                            {selectedImage ? selectedImage.name : 'No file chosen'}
                        </span>
                        <input 
                            type="file" 
                            id="image" 
                            accept="image/*"
                            onChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                            className="sr-only"
                        />
                    </div>
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-2 px-4 rounded-lg">Post Announcement</button>
            </form>
        </div>
    );

    return (
        <>
            {notification && <Notification message={notification} type="success" onClose={() => setNotification(null)} />}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {canPost && <ManagerView />}
                <div className={canPost ? "lg:col-span-2" : "lg:col-span-3"}>
                    <div className="bg-white p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Company Announcements</h3>
                        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                            {announcements.map(ann => (
                                <div key={ann.id} className={`p-4 border rounded-lg flex items-start space-x-4 ${!ann.isRead ? 'bg-indigo-50 border-primary' : 'bg-slate-50'}`}>
                                    {!ann.isRead && (
                                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" title="New Announcement"></div>
                                    )}
                                    <div className="flex-1 w-full">
                                        <p className="font-bold text-gray-800 text-lg">{ann.title}</p>
                                        <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{ann.content}</p>
                                        
                                        {ann.imageUrl && (
                                            <div className="mt-3">
                                                <img 
                                                    src={ann.imageUrl} 
                                                    alt="Announcement Attachment" 
                                                    className="rounded-lg max-h-64 w-full object-cover border border-gray-200"
                                                />
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-400 mt-3 text-right">
                                            Posted by {ann.author} on {ann.date.toLocaleDateString('en-US')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {announcements.length === 0 && (
                                <p className="text-center text-gray-500 py-8">No announcements yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Announcements;
