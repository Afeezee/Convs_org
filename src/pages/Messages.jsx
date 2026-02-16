import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Send, Image as ImageIcon, Loader2, Plus, UserPlus, X, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/shared/Avatar";
import moment from "moment";

export default function Messages() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allMessages = [], isLoading } = useQuery({
    queryKey: ["messages", user?.email],
    queryFn: async () => {
      const sent = await base44.entities.Message.filter({ sender_email: user.email });
      const received = await base44.entities.Message.filter({ receiver_email: user.email });
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user,
  });

  // Use Profile entity for user search in new chat
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles-messages"],
    queryFn: () => base44.entities.Profile.list("-created_date", 100),
    enabled: !!user,
  });

  const conversations = React.useMemo(() => {
    if (!user) return [];
    const convMap = new Map();
    allMessages.forEach(msg => {
      const otherEmail = msg.sender_email === user.email ? msg.receiver_email : msg.sender_email;
      const otherName = msg.sender_email === user.email ? msg.receiver_name : msg.sender_name;
      const convId = msg.conversation_id;
      
      if (!convMap.has(convId)) {
        convMap.set(convId, {
          id: convId,
          otherEmail,
          otherName,
          lastMessage: msg.content,
          lastMessageDate: msg.created_date,
          unreadCount: 0,
        });
      }
      
      if (msg.receiver_email === user.email && !msg.is_read) {
        convMap.get(convId).unreadCount++;
      }
    });
    return Array.from(convMap.values()).sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
  }, [allMessages, user]);

  const activeMessages = React.useMemo(() => {
    if (!activeConversation) return [];
    return allMessages
      .filter(m => m.conversation_id === activeConversation.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [allMessages, activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  useEffect(() => {
    if (activeConversation && user) {
      const unreadMessages = activeMessages.filter(m => m.receiver_email === user.email && !m.is_read);
      unreadMessages.forEach(m => {
        base44.entities.Message.update(m.id, { is_read: true });
      });
      if (unreadMessages.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["messages"] });
      }
    }
  }, [activeConversation, activeMessages, user]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !mediaFile) || !activeConversation) return;
    setIsSending(true);

    const modResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Moderate this private message: "${messageText}". Check for harassment, threats, spam.`,
      response_json_schema: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["approve", "block"] },
          feedback: { type: "string" },
        },
      },
    });

    if (modResult.action === "block") {
      alert(modResult.feedback);
      setIsSending(false);
      return;
    }

    let mediaUrl = "";
    if (mediaFile) {
      const upload = await base44.integrations.Core.UploadFile({ file: mediaFile });
      mediaUrl = upload.file_url;
    }

    await base44.entities.Message.create({
      conversation_id: activeConversation.id,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: activeConversation.otherEmail,
      receiver_name: activeConversation.otherName,
      content: messageText,
      media_url: mediaUrl,
      status: "sent",
    });

    setMessageText("");
    setMediaFile(null);
    setIsSending(false);
    queryClient.invalidateQueries({ queryKey: ["messages"] });
  };

  const handleStartNewChat = (targetProfile) => {
    const convId = [user.email, targetProfile.email].sort().join("_");
    const existing = conversations.find(c => c.id === convId);
    if (existing) {
      setActiveConversation(existing);
    } else {
      setActiveConversation({
        id: convId,
        otherEmail: targetProfile.email,
        otherName: targetProfile.full_name,
        lastMessage: "",
        lastMessageDate: new Date(),
        unreadCount: 0,
      });
    }
    setShowNewChat(false);
  };

  const filteredProfiles = allProfiles.filter(p =>
    p.email !== user?.email &&
    (p.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.username?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--convs-accent)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100vh-120px)]">
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-full">
        {/* Conversations List */}
        <div className="convs-card flex flex-col h-full">
          <div className="p-4 border-b border-[var(--convs-border)] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--convs-text)]">Messages</h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors"
            >
              <Plus className="w-5 h-5 text-[var(--convs-accent)]" />
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-[var(--convs-text-muted)] opacity-40" />
                <p className="text-sm text-[var(--convs-text-muted)]">No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv)}
                  className={`w-full flex items-start gap-3 p-4 border-b border-[var(--convs-border)] hover:bg-[var(--convs-card-hover)] transition-colors text-left ${
                    activeConversation?.id === conv.id ? "bg-[var(--convs-accent-light)]" : ""
                  }`}
                >
                  <Avatar name={conv.otherName} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm text-[var(--convs-text)] truncate">{conv.otherName}</p>
                      <span className="text-xs text-[var(--convs-text-muted)]">{moment(conv.lastMessageDate).fromNow()}</span>
                    </div>
                    <p className="text-xs text-[var(--convs-text-secondary)] truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--convs-accent)] text-white text-xs font-bold">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="convs-card flex flex-col h-full overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat Header - fixed */}
              <div className="p-4 border-b border-[var(--convs-border)] flex items-center gap-3 flex-shrink-0">
                <Avatar name={activeConversation.otherName} size="md" />
                <div>
                  <p className="font-semibold text-[var(--convs-text)]">{activeConversation.otherName}</p>
                  <p className="text-xs text-[var(--convs-text-muted)]">{activeConversation.otherEmail}</p>
                </div>
              </div>

              {/* Messages - scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
                {activeMessages.length === 0 && (
                  <div className="text-center py-10 text-sm text-[var(--convs-text-muted)]">
                    No messages yet. Say hello!
                  </div>
                )}
                {activeMessages.map(msg => {
                  const isOwn = msg.sender_email === user.email;
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      {!isOwn && (
                        <div className="flex-shrink-0 mr-2 mt-auto">
                          <Avatar name={activeConversation.otherName} size="xs" />
                        </div>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          isOwn
                            ? "rounded-br-md"
                            : "rounded-bl-md"
                        }`}
                        style={{
                          background: isOwn ? "#6366F1" : "var(--convs-bg-tertiary)",
                          color: isOwn ? "#FFFFFF" : "var(--convs-text)",
                        }}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.media_url && (
                          <img src={msg.media_url} alt="" className="mt-2 rounded-lg max-w-full" />
                        )}
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: isOwn ? "rgba(255,255,255,0.7)" : "var(--convs-text-muted)" }}
                        >
                          {moment(msg.created_date).format("h:mm A")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area - fixed */}
              <div className="p-4 border-t border-[var(--convs-border)] flex-shrink-0">
                {mediaFile && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-[var(--convs-bg-tertiary)] rounded-lg">
                    <img src={URL.createObjectURL(mediaFile)} alt="" className="w-12 h-12 rounded object-cover" />
                    <p className="text-xs text-[var(--convs-text-muted)] flex-1 truncate">{mediaFile.name}</p>
                    <button onClick={() => setMediaFile(null)} className="text-[var(--convs-text-muted)]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors flex-shrink-0"
                  >
                    <ImageIcon className="w-5 h-5 text-[var(--convs-text-muted)]" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={e => setMediaFile(e.target.files[0])} className="hidden" />
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!messageText.trim() && !mediaFile) || isSending}
                    className="p-2 rounded-lg flex-shrink-0 disabled:opacity-50"
                    style={{ background: "#6366F1", color: "#FFFFFF" }}
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-[var(--convs-text-muted)] opacity-40" />
                <p className="text-[var(--convs-text-muted)]">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setShowNewChat(false)}>
          <div className="w-full max-w-md bg-[var(--convs-card)] rounded-2xl border border-[var(--convs-border)] p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--convs-text)]">New Message</h3>
              <button onClick={() => setShowNewChat(false)}>
                <X className="w-5 h-5 text-[var(--convs-text-muted)]" />
              </button>
            </div>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mb-3 bg-[var(--convs-bg-secondary)] border-[var(--convs-border)] text-[var(--convs-text)]"
            />
            <div className="max-h-96 overflow-y-auto space-y-1">
              {filteredProfiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleStartNewChat(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--convs-bg-tertiary)] transition-colors"
                >
                  <Avatar name={p.full_name} image={p.profile_image} size="sm" />
                  <div className="text-left">
                    <p className="font-medium text-sm text-[var(--convs-text)]">{p.full_name}</p>
                    <p className="text-xs text-[var(--convs-text-muted)]">@{p.username || p.email?.split("@")[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}