import { IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { MemoizedChatMessage } from './MemoizedChatMessage';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');
  const {
    state: {
      selectedConversation,
      conversations,
      models,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save message to database
  const saveMessageToDatabase = async (
    content: string, 
    sender: 'user' | 'assistant', 
    sessionId: number | null = null
  ) => {
    try {
      const response = await fetch('/api/messages/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sender,
          sessionId,
          sessionTitle: selectedConversation?.name,
          metadata: {
            model: selectedConversation?.model?.name,
            temperature: selectedConversation?.temperature
          }
        }),
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        // If this created a new session, store the session ID
        if (sessionId === null) {
          setActiveSessionId(result.sessionId);
          // Store the session ID in localStorage so other components can access it
          localStorage.setItem('activeSessionId', result.sessionId.toString());
        }
        return result.sessionId;
      } else {
        console.error('Failed to save message:', result.message);
        toast.error('Failed to save message to database. Please try again.');
        return sessionId;
      }
    } catch (error) {
      console.error('Error saving message to database:', error);
      toast.error('Error saving message to database. Please try again.');
      return sessionId;
    }
  };

  // Save AI response to database
  const saveResponseToDatabase = async (content: string, sessionId: number) => {
    try {
      await fetch('/api/messages/save-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sessionId
        }),
      });
    } catch (error) {
      console.error('Error saving AI response to database:', error);
    }
  };

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0 ) => {
      if (selectedConversation) {
        // Save the user's message to the database immediately before any other operations
        const sessionId = await saveMessageToDatabase(message.content, 'user', activeSessionId);
        
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        
        const chatBody: ChatBody = {
          model: updatedConversation.model.name,
          system: updatedConversation.prompt,
          prompt: updatedConversation.messages.map(message => message.content).join(' '),
          options: { temperature: updatedConversation.temperature },
        };
        const endpoint = getEndpoint();
        let body;
        body = JSON.stringify({
          ...chatBody,
        });
        const controller = new AbortController();
        
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body,
          });
          
          if (!response.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            
            try {
              // Try to parse error details from response
              const errorData = await response.json();
              
              if (errorData.error && errorData.message) {
                // Set a specific error message for the UI
                homeDispatch({
                  field: 'modelError',
                  value: {
                    title: errorData.error,
                    messageLines: [errorData.message],
                    suggestion: errorData.suggestion || 'Please try again later.',
                    code: response.status.toString()
                  }
                });
                
                toast.error(`${errorData.error}: ${errorData.message}`);
              } else {
                toast.error(`Error: ${response.statusText}`);
              }
            } catch (parseError) {
              // If we can't parse the JSON, just use the status text
              toast.error(`Error: ${response.statusText || 'Unknown error'}`);
            }
            
            return;
          }
          
          const data = response.body;
          if (!data) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            return;
          }
          
          if (!false) {
            if (updatedConversation.messages.length === 1) {
              const { content } = message;
              const customName =
                content.length > 30 ? content.substring(0, 30) + '...' : content;
              updatedConversation = {
                ...updatedConversation,
                name: customName,
              };
            }
            homeDispatch({ field: 'loading', value: false });
            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let isFirst = true;
            let text = '';
            while (!done) {
              if (stopConversationRef.current === true) {
                controller.abort();
                done = true;
                break;
              }
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              const chunkValue = decoder.decode(value);
              text += chunkValue;
              if (isFirst) {
                isFirst = false;
                const updatedMessages: Message[] = [
                  ...updatedConversation.messages,
                  { role: 'assistant', content: chunkValue },
                ];
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              } else {
                const updatedMessages: Message[] =
                  updatedConversation.messages.map((message, index) => {
                    if (index === updatedConversation.messages.length - 1) {
                      return {
                        ...message,
                        content: text,
                      };
                    }
                    return message;
                  });
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              }
            }
            
            // Save the complete AI response to the database after streaming is complete
            if (sessionId) {
              await saveResponseToDatabase(text, sessionId);
            }
            
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              (conversation) => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'messageIsStreaming', value: false });
          } else {
            const { answer } = await response.json();
            const updatedMessages: Message[] = [
              ...updatedConversation.messages,
              { role: 'assistant', content: answer },
            ];
            updatedConversation = {
              ...updatedConversation,
              messages: updatedMessages,
            };
            homeDispatch({
              field: 'selectedConversation',
              value: updateConversation,
            });
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              (conversation) => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              },
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({ field: 'conversations', value: updatedConversations });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
          }
        } catch (error) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          
          // Handle network errors
          homeDispatch({
            field: 'modelError',
            value: {
              title: 'Network Error',
              messageLines: ['Failed to connect to the server.'],
              suggestion: 'Please check your internet connection and ensure the backend server is running.',
              code: 'NETWORK_ERROR'
            }
          });
          
          toast.error('Network Error: Failed to connect to the server.');
          return;
        }
      }
    },
    [
      conversations,
      selectedConversation,
      stopConversationRef,
      homeDispatch,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  // Load session messages with their database IDs
  const loadSessionMessages = useCallback(async () => {
    if (!activeSessionId || !selectedConversation) return;
    
    try {
      const response = await fetch(`/api/messages/get-session-messages?sessionId=${activeSessionId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data.length > 0) {
          // Create a mapping of message content to database IDs
          const messageMap = new Map();
          result.data.forEach((dbMessage: any) => {
            messageMap.set(dbMessage.content, dbMessage.id);
          });
          
          // Update the conversation messages with database IDs
          if (selectedConversation.messages.length > 0) {
            const updatedMessages = selectedConversation.messages.map(message => {
              const dbId = messageMap.get(message.content);
              if (dbId) {
                return { ...message, id: dbId };
              }
              return message;
            });
            
            if (JSON.stringify(updatedMessages) !== JSON.stringify(selectedConversation.messages)) {
              handleUpdateConversation(selectedConversation, {
                key: 'messages',
                value: updatedMessages
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  }, [activeSessionId, selectedConversation, handleUpdateConversation]);

  useEffect(() => {
    // Load the active session ID from localStorage when the component mounts
    const storedSessionId = localStorage.getItem('activeSessionId');
    if (storedSessionId) {
      setActiveSessionId(parseInt(storedSessionId));
    }
  }, []);
  
  // Load database message IDs when activeSessionId changes
  useEffect(() => {
    if (activeSessionId && selectedConversation) {
      loadSessionMessages();
    }
  }, [activeSessionId, loadSessionMessages]);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
        <>
          <div
            className="max-h-full overflow-x-hidden"
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages.length === 0 ? (
              <>
                <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">
                  <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                    {models.length === 0 ? (
                      <div>
                        <Spinner size="16px" className="mx-auto" />
                      </div>
                    ) : (
                      'Chatbot Ollama'
                    )}
                  </div>

                  {models.length > 0 && (
                    <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                      <ModelSelect />

                      <SystemPrompt
                        conversation={selectedConversation}
                        prompts={prompts}
                        onChangePrompt={(prompt) =>
                          handleUpdateConversation(selectedConversation, {
                            key: 'prompt',
                            value: prompt,
                          })
                        }
                      />

                      <TemperatureSlider
                        label={t('Temperature')}
                        onChangeTemperature={(temperature) =>
                          handleUpdateConversation(selectedConversation, {
                            key: 'temperature',
                            value: temperature,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                  {t('Model')}: {selectedConversation?.model.name} | {t('Temp')}
                  : {selectedConversation?.temperature} |
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={handleSettings}
                  >
                    <IconSettings size={18} />
                  </button>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onClearAll}
                  >
                    <IconClearAll size={18} />
                  </button>
                </div>
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                      <ModelSelect />
                    </div>
                  </div>
                )}

                {selectedConversation?.messages.map((message, index) => (
                  <MemoizedChatMessage
                    key={index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      setCurrentMessage(editedMessage);
                      // discard edited message and the ones that come after then resend
                      handleSend(
                        editedMessage,
                        selectedConversation?.messages.length - index,
                      );
                    }}
                  />
                ))}

                {loading && <ChatLoader />}

                <div
                  className="h-[162px] bg-white dark:bg-[#343541]"
                  ref={messagesEndRef}
                />
              </>
            )}
          </div>

          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message) => {
              setCurrentMessage(message);
              handleSend(message, 0);
            }}
            onScrollDownClick={handleScrollDown}
            onRegenerate={() => {
              if (currentMessage) {
                handleSend(currentMessage, 2);
              }
            }}
            showScrollDownButton={showScrollDownButton}
          />
        </>
    </div>
  );
});
Chat.displayName = 'Chat';
