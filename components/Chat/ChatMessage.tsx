import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUser,
} from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

// Import safely to avoid build issues
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
// Replace direct import with a dynamic approach for rehype-mathjax
// import rehypeMathjax from 'rehype-mathjax';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void
}

export const ChatMessage: FC<Props> = memo(({ message, messageIndex, onEdit }) => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, conversations, currentMessage, messageIsStreaming },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [savedRating, setSavedRating] = useState(0);
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content != messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const { messages } = selectedConversation;
    const findIndex = messages.findIndex((elm) => elm === message);

    if (findIndex < 0) return;

    if (
      findIndex < messages.length - 1 &&
      messages[findIndex + 1].role === 'assistant'
    ) {
      messages.splice(findIndex, 2);
    } else {
      messages.splice(findIndex, 1);
    }
    const updatedConversation = {
      ...selectedConversation,
      messages,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    
    homeDispatch({ field: 'selectedConversation', value: single });
    homeDispatch({ field: 'conversations', value: all });
  };

  const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
      e.preventDefault();
      handleEditMessage();
    }
  };

  const copyOnClick = () => {
    if (!navigator.clipboard) return;

    navigator.clipboard.writeText(message.content).then(() => {
      setMessageCopied(true);
      setTimeout(() => {
        setMessageCopied(false);
      }, 2000);
    });
  };
  
  const handleRating = async (value: number) => {
    try {
      // Get active session ID from localStorage
      const activeSessionIdStr = localStorage.getItem('activeSessionId');
      const activeSessionId = activeSessionIdStr ? parseInt(activeSessionIdStr) : null;
      
      // Use message ID if available, otherwise use index with session ID
      const messageId = message.id ? Number(message.id) : undefined;
      
      const response = await fetch('/api/messages/save-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          messageIndex: messageIndex,
          sessionId: activeSessionId,
          rating: value,
        }),
      });
      
      if (response.ok) {
        setSavedRating(value);
        setIsRatingSubmitted(true);
        toast.success(t('Rating submitted!'));
      } else {
        toast.error(t('Failed to submit rating'));
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error(t('Error submitting rating'));
    }
  };

  const handleRatingHover = (hoveredRating: number) => {
    if (!isRatingSubmitted) {
      setRating(hoveredRating);
    }
  };

  const renderRatingStars = () => {
    const stars = [];
    const displayRating = isRatingSubmitted ? savedRating : rating;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          className={`text-gray-500 hover:text-yellow-500 ${
            i <= displayRating ? 'text-yellow-500' : ''
          } ${isRatingSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={() => !isRatingSubmitted && handleRating(i)}
          onMouseEnter={() => handleRatingHover(i)}
          onMouseLeave={() => !isRatingSubmitted && setRating(0)}
          disabled={isRatingSubmitted}
        >
          {i <= displayRating ? 
            <IconStarFilled size={20} stroke={1.5} /> : 
            <IconStar size={20} stroke={1.5} />
          }
        </button>
      );
    }
    return (
      <div className="flex space-x-1">
        {stars}
      </div>
    );
  };

  // Check for existing feedback
  const checkExistingFeedback = async () => {
    // Only check for assistant messages
    if (message.role !== 'assistant' || !message.id) return;
    
    try {
      const response = await fetch(`/api/messages/get-feedback?messageId=${message.id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data.count > 0) {
          setSavedRating(Math.round(result.data.averageRating));
          setIsRatingSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing feedback:', error);
    }
  };

  useEffect(() => {
    setMessageContent(message.content);
  }, [message.content]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);
  
  // Check for existing feedback when component mounts
  useEffect(() => {
    if (message.role === 'assistant') {
      checkExistingFeedback();
    }
  }, [message.id]);

  return (
    <div
      className={`group md:px-4 ${
        message.role === 'assistant'
          ? 'border-b border-black/10 bg-gray-50/90 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654]/95 dark:text-gray-100'
          : 'border-b border-black/10 bg-white/95 text-gray-800 dark:border-gray-900/50 dark:bg-[#343541]/95 dark:text-gray-100'
      }`}
      style={{ overflowWrap: 'anywhere' }}
      onMouseEnter={() => message.role === 'assistant' && setShowRating(true)}
      onMouseLeave={() => message.role === 'assistant' && setShowRating(false)}
    >
      <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] text-right">
          {message.role === 'assistant' ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-purple-500/70 to-blue-500/70 text-white">
              <IconRobot size={20} stroke={2.5} />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-r from-teal-500/70 to-green-500/70 text-white">
              <IconUser size={20} stroke={2.5} />
            </div>
          )}
        </div>

        <div className="prose mt-[-2px] w-full dark:prose-invert">
          {message.role === 'user' ? (
            <div className="flex w-full">
              {isEditing ? (
                <div className="flex w-full flex-col">
                  <textarea
                    ref={textareaRef}
                    className="w-full resize-none whitespace-pre-wrap border-none rounded-md dark:bg-[#343541]/50 focus:ring-2 focus:ring-blue-500/50 p-2"
                    value={messageContent}
                    onChange={handleInputChange}
                    onKeyDown={handlePressEnter}
                    onCompositionStart={() => setIsTyping(true)}
                    onCompositionEnd={() => setIsTyping(false)}
                    style={{
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      lineHeight: 'inherit',
                      margin: '0',
                      overflow: 'hidden',
                    }}
                  />

                  <div className="mt-10 flex justify-center space-x-4">
                    <button
                      className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50 transition-colors duration-200 shadow-sm"
                      onClick={handleEditMessage}
                      disabled={messageContent.trim().length <= 0}
                    >
                      {t('Save & Submit')}
                    </button>
                    <button
                      className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors duration-200"
                      onClick={() => {
                        setMessageContent(message.content);
                        setIsEditing(false);
                      }}
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose whitespace-pre-wrap dark:prose-invert flex-1">
                  {message.content}
                </div>
              )}

              {!isEditing && (
                <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={toggleEditing}
                  >
                    <IconEdit size={18} stroke={1.5} />
                  </button>
                  <button
                    className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                    onClick={handleDeleteMessage}
                  >
                    <IconTrash size={18} stroke={1.5} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-row">
                <MemoizedReactMarkdown
                  className="prose dark:prose-invert flex-1"
                  remarkPlugins={[remarkGfm, remarkMath]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const childrenArray = Array.isArray(children) ? children : [children];
                      if (childrenArray.length) {
                        if (childrenArray[0] === '▍') {
                          return <span className="animate-pulse cursor-default mt-1">▍</span>
                        }

                        if (typeof childrenArray[0] === 'string') {
                          childrenArray[0] = childrenArray[0].replace("`▍`", "▍");
                        }
                      }

                      const match = /language-(\w+)/.exec(className || '');

                      return !inline ? (
                        <CodeBlock
                          key={Math.random()}
                          language={(match && match[1]) || ''}
                          value={String(children).replace(/\n$/, '')}
                          {...props}
                        />
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                          {children}
                        </table>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="break-words border border-black px-3 py-1 dark:border-white">
                          {children}
                        </td>
                      );
                    },
                  }}
                >
                  {`${message.content}${
                    messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                  }`}
                </MemoizedReactMarkdown>

                <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                  {messagedCopied ? (
                    <div className="p-1 rounded-md bg-green-500/10 text-green-500 dark:text-green-400">
                      <IconCheck size={18} stroke={1.5} />
                    </div>
                  ) : (
                    <button
                      className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
                      onClick={copyOnClick}
                    >
                      <IconCopy size={18} stroke={1.5} />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Rating section */}
              <div className={`flex justify-end mt-2 items-center gap-2 transition-opacity duration-200 ${showRating || isRatingSubmitted ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-sm text-gray-500 dark:text-gray-400">{isRatingSubmitted ? t('Thank you for your feedback!') : t('Rate this response:')}</span>
                {renderRatingStars()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
