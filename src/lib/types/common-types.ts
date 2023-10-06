import type { GithubLabel, GithubNotificationType, GithubRepository } from './github-types';

export type User = {
	name?: string;
	login: string;
	avatar?: string;
	bot?: boolean;
};

export type Session = {
	githubUser?: User;
	githubAccessToken?: string;
	gitlabUser?: User;
	gitlabAccessToken?: string;
};

export type NotificationIcon =
	| 'commit'
	| 'open-issue'
	| 'completed-issue'
	| 'closed-issue'
	| 'draft-pr'
	| 'open-pr'
	| 'merged-pr'
	| 'closed-pr'
	| 'release'
	| 'discussion'
	| 'workflow-fail'
	| 'workflow-success'
	| 'unsupported';

export type NotificationData = {
	id: string;
	type: GithubNotificationType;
	unread: boolean;
	pinned: boolean;
	done: boolean;
	muted: boolean;
	author?: User;
	creator?: User;
	title: string;
	description: string;
	priority?: {
		label: string;
		value: number;
	};
	time: string;
	icon: NotificationIcon;
	opened?: boolean;
	owner: string;
	repo: string;
	repoId: string;
	ownerAvatar: string;
	number?: number;
	labels?: GithubLabel[];
	url?: string;
	previously?: {
		author?: User;
		description: NotificationData['description'];
	};
};

export type TypeFilters = Array<{
	name: string;
	type: GithubNotificationType;
	active: boolean;
	number: number;
}>;

export type Subscription = {
	repo: GithubRepository;
	active: boolean;
};

export type SavedNotifications = Array<{
	id: string;
	author?: User;
	description: string;
	pinned: boolean;
	unread: boolean;
	done: boolean;
	muted: boolean;
	time: string;
	previously?: NotificationData['previously'];
}>;

export type WatchedRepo = {
	id: string;
	name: string;
	ownerName: string;
	ownerAvatar: string;
	number: number;
	active: boolean;
	muted: boolean;
};

export type WatchedPerson = {
	login: string;
	avatar: string;
	number: number;
	active: boolean;
	muted: boolean;
	bot?: boolean;
};

export type Settings = {
	activateNotifications: boolean;
	showNotificationsSyncTimer: boolean;
	readWhenOpenInBrowser: boolean;
	readWhenPin: boolean;
	showNotificationsRepo: boolean;
	notificationNumber: number;
	sidebarHidden: boolean;
	showOnlyOpen: boolean;
	pats: Array<{
		owner: string;
		token: string;
	}>;
	prioritySorting: boolean;
	showPriority: boolean;
	providerView: 'github' | 'gitlab' | 'both';
	applyFiltersForDone: boolean;
	viewMode: 'List' | 'Kanban' | 'Kanban (vertical)';
	activeTray: boolean;
};

export type Priority = {
	value: number;
} & (
	| {
			criteria: 'many-comments' | 'many-reactions' | 'assigned' | 'mentioned' | 'review-request';
	  }
	| {
			criteria: 'label';
			specifier: string;
	  }
	| {
			criteria: 'state';
			specifier: 'open' | 'closed';
	  }
	| {
			criteria: 'type';
			specifier: GithubNotificationType;
	  }
);
