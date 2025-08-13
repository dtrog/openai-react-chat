import React, {useContext, useEffect, useRef, useState} from 'react';
import ChatBlock from "./ChatBlock";
import ModelSelect from "./ModelSelect";
import ProviderSelect from "./ProviderSelect";
import {AIModel} from "../providers/types";
import { discoverProviderModels } from '../service/ModelDiscoveryService';
import {ChatMessage} from "../models/ChatCompletion";
import {useTranslation} from 'react-i18next';
import Tooltip from "./Tooltip";
import {Conversation} from "../service/ConversationService";
import {DEFAULT_INSTRUCTIONS} from "../constants/appConstants";
import {UserContext} from '../UserContext';
import {InformationCircleIcon} from "@heroicons/react/24/outline";
import {NotificationService} from '../service/NotificationService';
import { ProviderManager } from '../providers/ProviderManager';

interface Props {
  chatBlocks: ChatMessage[];
  onChatScroll: (isAtBottom: boolean) => void;
  allowAutoScroll: boolean;
  model: string | null;
  onModelChange: (value: string | null) => void;
  conversation: Conversation | null;
  loading: boolean;
}

const Chat: React.FC<Props> = ({
                                 chatBlocks, onChatScroll, allowAutoScroll, model,
                                 onModelChange, conversation, loading
                               }) => {
  const {userSettings, setUserSettings} = useContext(UserContext);
  const {t} = useTranslation();
  const [models, setModels] = useState<AIModel[]>([]);
  const chatDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      if (!userSettings.activeProvider) {
        setModels([]);
        return;
      }
      try {
        const providerConfig = userSettings.providerConfigs.find(
          (p) => p.name === userSettings.activeProvider
        );
        if (!providerConfig) {
          setModels([]);
          return;
        }
        const models = await discoverProviderModels(userSettings.activeProvider, providerConfig);
        setModels(models);
      } catch (err) {
        NotificationService.handleUnexpectedError(err as Error, 'Failed to get list of models');
        setModels([]);
      }
    };
    loadModels();
  }, [userSettings.activeProvider, userSettings.providerConfigs]);

  useEffect(() => {
    if (chatDivRef.current && allowAutoScroll) {
      chatDivRef.current.scrollTop = chatDivRef.current.scrollHeight;
    }
  }, [chatBlocks]);

  useEffect(() => {
    const chatContainer = chatDivRef.current;
    if (chatContainer) {
      const isAtBottom =
          chatContainer.scrollHeight - chatContainer.scrollTop ===
          chatContainer.clientHeight;

      // Initially hide the button if chat is at the bottom
      onChatScroll(isAtBottom);
    }
  }, []);

  const findModelById = (id: string | null): AIModel | undefined => {
    return models.find(model => model.id === id);
  };

  const formatContextWindow = (contextWindow: number | undefined) => {
    if (contextWindow) {
      return Math.round(contextWindow / 1000) + 'k';
    }
    return '?k';
  }

  const handleScroll = () => {
    if (chatDivRef.current) {
      const scrollThreshold = 20;
      const isAtBottom =
          chatDivRef.current.scrollHeight -
          chatDivRef.current.scrollTop <=
          chatDivRef.current.clientHeight + scrollThreshold;

      // Notify parent component about the auto-scroll status
      onChatScroll(isAtBottom);

      // Disable auto-scroll if the user scrolls up
      if (!isAtBottom) {
        onChatScroll(false);
      }
    }
  };

  return (
      <div id={'chat-container'} ref={chatDivRef} className="relative chat-container flex-1 overflow-auto" onScroll={handleScroll}>
        <div  id={'chat-container1'}  className="relative chat-container1 flex flex-col items-center text-sm dark:bg-gray-900">
          <div
              className={`flex w-full items-center justify-center gap-1 p-3 text-gray-500 dark:border-gray-900/50 dark:bg-gray-900 dark:text-gray-300 ${!(conversation === null) ? 'border-b border-black/10' : ''}`}>
            <div className="flex items-center flex-row gap-1">
              {!conversation ? '' : (
                  <Tooltip
                      title={conversation.systemPrompt ?? userSettings.instructions ?? DEFAULT_INSTRUCTIONS}
                      side="bottom" sideOffset={10}>
                              <span style={{marginLeft: '10px', fontSize: '0.85rem', color: '#6b7280'}}>
                                 <InformationCircleIcon width={20} height={20} stroke={'currentColor'}/>
                              </span>
                  </Tooltip>
              )}
              <span style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            {t('model')}
                {conversation && (
                    <span>

                                  <span style={{marginLeft: '0.25em'}}>{conversation.model}</span>
                                  <Tooltip title={t('context-window')} side="bottom" sideOffset={10}>
                                      <span style={{marginLeft: '10px', fontSize: '0.85rem', color: '#6b7280'}}>
                                        {formatContextWindow(findModelById(conversation.model)?.contextWindow)}
                                      </span>
                                  </Tooltip>
                                     <Tooltip title={t('knowledge-cutoff')} side="bottom" sideOffset={10}>
                                      <span style={{marginLeft: '10px', fontSize: '0.85rem', color: '#6b7280'}}>
                                        {findModelById(conversation.model)?.knowledgeCutoff}
                                      </span>
                                  </Tooltip>
                              </span>
                )
                }
                        </span>
              {!conversation && (
                  <div className="grow flex space-x-2" style={{width: '70ch'}}>
                    <div className="w-1/2">
                      <ProviderSelect />
                    </div>
                    <div className="w-1/2">
                      <ModelSelect value={model} onModelSelect={onModelChange} models={models as any}/>
                    </div>
                  </div>
              )}
            </div>
          </div>
          {chatBlocks.map((block, index) => (
              <ChatBlock key={`chat-block-${block.id}`}
                         block={block}
                         loading={index === chatBlocks.length - 1 && loading}
                         isLastBlock={index === chatBlocks.length - 1}/>
          ))}
          <div className="w-full h-24 shrink-0"></div>
        </div>
      </div>
  );
};

export default Chat;
