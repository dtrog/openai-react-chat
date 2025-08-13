export interface ModelPermission {
  id: string;
  object: string;
  created: number;
  allow_create_engine: boolean;
  allow_sampling: boolean;
  allow_logprobs: boolean;
  allow_search_indices: boolean;
  allow_view: boolean;
  allow_fine_tuning: boolean;
  organization: string;
  group: null | string;
  is_blocking: boolean;
}

export interface AIModel {
  id: string;
  object: string;
  owned_by: string;
  permission: ModelPermission[];
  context_window: number;
  knowledge_cutoff: string;
  image_support: boolean;
  preferred: boolean;
  deprecated: boolean;
}

export interface AIModelListResponse {
  data: AIModel[];
  object: string;
}
