<script lang="ts">
	import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { open } from '@tauri-apps/api/shell';
	import { onDestroy, onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { Button, Tooltip } from '$lib/components';
	import { delayedHover, fetchGithub } from '$lib/features';
	import { getGrayscale, getNotificationIcon } from '$lib/helpers';
	import {
		CheckIcon,
		DoubleCheckIcon,
		MuteIcon,
		PinIcon,
		PriorityDownIcon,
		PriorityUpIcon,
		RestoreIcon,
		MutedIcon,
		UnpinIcon,
		UnreadIcon,
		ExternalLinkIcon,
		ThreeDotsIcon
	} from '$lib/icons';
	import { githubNotifications, gitlabNotifications, settings } from '$lib/stores';
	import type { NotificationData } from '$lib/types';
	import NotificationDescription from './NotificationDescription.svelte';
	import NotificationLabels from './NotificationLabels.svelte';
	import NotificationStatus from './NotificationStatus.svelte';

	export let data: NotificationData;
	export let dragged = false;
	export let interactive = true;

	let {
		id,
		from,
		status,
		muted,
		author,
		title,
		description,
		priority,
		type,
		icon,
		repository,
		number,
		labels,
		url,
		previously
	} = data;
	let hoverAction = false;
	let hoverActionTimeout: ReturnType<typeof setTimeout>;

	$: isTrayApp = browser && window.location.pathname === '/tray';

	let unlisten: UnlistenFn = () => null;

	onMount(async () => {
		if (!isTrayApp && window.__TAURI__) {
			unlisten = await listen<{ status: NotificationData['status'] }>(
				`notification-toggle:${id}`,
				(event) => {
					handleChangeStatus(event.payload.status)();
					unlisten();
				}
			);
		}
	});

	onDestroy(() => {
		unlisten();
	});

	function handleHoverActions(event: MouseEvent) {
		if (event.type === 'mouseenter') {
			hoverAction = true;
			clearTimeout(hoverActionTimeout);
			return;
		}
		hoverActionTimeout = setTimeout(() => {
			hoverAction = false;
		}, 200);
	}

	function markAsReadInGitHub() {
		fetchGithub(`notifications/threads/${id}`, { method: 'PATCH' });
	}

	function handleChangeStatus(status: NotificationData['status'] | 'muted') {
		return () => {
			if (isTrayApp) {
				emit(`notification-toggle:${id}`, { status });
				return;
			}

			(from === 'github' ? githubNotifications : gitlabNotifications).update((previous) =>
				// @ts-expect-error TODO: bump TypeScript to 5.3
				previous.map((notification) => {
					if (notification.id !== id) return notification;

					if (
						from === 'github' &&
						notification.status === 'unread' &&
						(status === 'read' || status === 'done' || status === 'pinned')
					) {
						markAsReadInGitHub();
					}

					switch (true) {
						case status === 'muted':
							muted = !muted;
							return { ...notification, muted: !notification.muted };
						case status === 'unread':
						case status === 'read':
							return { ...notification, status };
						case status === 'pinned':
							return {
								...notification,
								status: notification.status === 'pinned' ? 'unread' : 'pinned'
							};
						case status === 'done':
							return { ...notification, status: notification.status === 'done' ? 'read' : 'done' };
						default:
							return notification;
					}
				})
			);
		};
	}

	function handleOpenInBrowser() {
		if (!url) return;
		if ($settings.readWhenOpenInBrowser && status === 'unread') {
			handleChangeStatus('read')();
		}
		openUrl(url);
	}

	function openUrl(url: string) {
		if (dragged) return;
		if (window.__TAURI__) {
			open(url);
			return;
		}
		window.open(url, '_blank');
	}
</script>

<div class="container" class:transparent={status === 'read'} class:dragged>
	<div class="notification">
		{#if $settings.showNotificationsRepo}
			<div class="top">
				<div class="repo">
					<button class="repo-button" on:mouseup={() => openUrl(repository.url)}>
						{repository.namespace}
					</button>
				</div>
				<NotificationStatus {data} />
			</div>
		{/if}
		<div class="description">
			<NotificationDescription {author} {description} {openUrl} {from} />
			{#if !$settings.showNotificationsRepo}
				<NotificationStatus {data} />
			{/if}
		</div>
		<div class="main" class:has-priority={priority && $settings.showPriority}>
			<span class="icon-container">
				<svelte:component this={getNotificationIcon(icon)} />
			</span>
			<div class="texts">
				<div
					class="title-container"
					class:underlined={!!url}
					use:delayedHover={'notification-hover'}
					on:mouseup={dragged ? null : handleOpenInBrowser}
					role="presentation"
				>
					<h3 class="notification-title">{title}</h3>
					{#if number}
						<span class="notification-number">#{number}</span>
					{/if}
				</div>
				{#if priority && $settings.showPriority}
					<div
						class="priority {priority.value > 0 ? 'up' : 'down'}"
						style:filter={getGrayscale(priority.value)}
					>
						{#if priority.value > 0}
							<PriorityUpIcon />
						{:else}
							<PriorityDownIcon />
						{/if}
						<span>{priority.label}</span>
					</div>
				{/if}
			</div>
		</div>
		<NotificationLabels {labels} />
		{#if !dragged && interactive}
			<div
				class="over"
				class:large-shadow={hoverAction}
				on:mouseenter={handleHoverActions}
				on:mouseleave={handleHoverActions}
				role="presentation"
			>
				{#if !hoverAction}
					<div class="action-trigger">
						<Button secondary icon>
							<ThreeDotsIcon />
						</Button>
					</div>
				{:else}
					{#if status === 'unread'}
						<Tooltip content="Mark as read" position="bottom right" hover>
							<Button icon on:click={handleChangeStatus('read')}>
								<CheckIcon />
							</Button>
						</Tooltip>
						<Tooltip content="Mark as done" position="bottom" hover>
							<Button secondary icon on:click={handleChangeStatus('done')}>
								<DoubleCheckIcon />
							</Button>
						</Tooltip>
					{:else if status === 'read' || status === 'pinned'}
						<Tooltip content="Mark as done" position="bottom right" hover>
							<Button icon on:click={handleChangeStatus('done')}>
								<DoubleCheckIcon />
							</Button>
						</Tooltip>
						{#if status === 'read'}
							<Tooltip content="Mark as unread" position="bottom" hover>
								<Button secondary icon on:click={handleChangeStatus('unread')}>
									<UnreadIcon />
								</Button>
							</Tooltip>
						{/if}
					{/if}
					{#if status === 'done'}
						<Tooltip content="Restore" position="bottom" hover>
							<Button icon on:click={handleChangeStatus('done')}>
								<RestoreIcon />
							</Button>
						</Tooltip>
					{:else}
						<Tooltip content={status === 'pinned' ? 'Unpin' : 'Pin'} position="bottom" hover>
							<Button secondary icon on:click={handleChangeStatus('pinned')}>
								{#if status === 'pinned'}
									<UnpinIcon />
								{:else}
									<PinIcon />
								{/if}
							</Button>
						</Tooltip>
					{/if}
					{#if url}
						<Tooltip content="Open in browser" position="bottom" hover>
							<Button secondary icon on:click={handleOpenInBrowser}>
								<ExternalLinkIcon />
							</Button>
						</Tooltip>
					{/if}
					{#if type === 'discussion' || type === 'issue' || type === 'pr'}
						{#if muted}
							<Tooltip content="Muted" position="bottom" hover>
								<Button secondary icon on:click={handleChangeStatus('muted')}>
									<MutedIcon />
								</Button>
							</Tooltip>
						{:else}
							<Tooltip content="Mute" position="bottom" hover>
								<Button secondary icon on:click={handleChangeStatus('muted')}>
									<MuteIcon />
								</Button>
							</Tooltip>
						{/if}
					{/if}
				{/if}
			</div>
		{/if}
	</div>
	{#if previously}
		<div class="previously">
			<NotificationDescription
				author={previously.author}
				description={previously.description}
				prefix="Previously, "
				{openUrl}
				{from}
			/>
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		border-radius: variables.$radius;
		background-color: variables.$grey-1;
		isolation: isolate;

		&:not(:hover) {
			.over {
				opacity: 0;
			}
		}

		&.transparent {
			opacity: 0.6;
			transition: opacity variables.$transition;

			&:hover {
				opacity: 1;
			}
		}

		&.dragged {
			@include mixins.modal-shadow;

			rotate: -4deg;
			transition: variables.$transition;
		}
	}

	.notification {
		@include mixins.box;

		position: relative;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		gap: 0.75rem;
	}

	.top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;

		.repo {
			overflow: hidden;
			width: 100%;
			text-align: left;
			white-space: nowrap;

			.repo-button {
				overflow: hidden;
				max-width: 100%;
				text-overflow: ellipsis;

				&:hover {
					text-decoration: underline;
				}
			}
		}
	}

	.description {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-top: -0.1rem;
		gap: 0.75rem;
	}

	.repo {
		@include typography.small;

		color: variables.$grey-4;
	}

	.main {
		display: flex;
		width: 100%;
		gap: 0.5rem;

		.icon-container {
			flex: 0 0 2rem;

			:global(svg) {
				width: 2rem;
				height: 2rem;
			}
		}

		.texts {
			display: flex;
			overflow: hidden;
			flex-direction: column;
			margin-top: 0.35rem;

			.title-container {
				@include typography.base;

				display: flex;
				overflow: hidden;
				gap: 0.5ch;

				.notification-title {
					display: inline;
					overflow: hidden;
					flex: 0 1 auto;
					hyphens: auto;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				.notification-number {
					color: variables.$blue-3;
				}

				&.underlined:hover * {
					cursor: pointer;
					text-decoration: underline;
				}

				&:global(.notification-hover) {
					display: unset;

					:global(.notification-title) {
						white-space: unset;
					}

					:global(.notification-title-number) {
						text-decoration: underline;
					}
				}
			}

			.priority {
				@include typography.small;

				display: flex;
				align-items: center;
				gap: 0.25rem;

				&.up {
					color: variables.$yellow;
				}

				&.down {
					color: variables.$red;
				}

				:global(svg) {
					height: 1rem;
				}
			}
		}

		&.has-priority {
			.icon-container {
				margin-top: 0.2rem;
			}

			.texts {
				margin-top: 0;
			}
		}
	}

	.over {
		position: absolute;
		display: flex;
		flex-flow: row-reverse wrap;
		justify-content: end;
		padding: 0.5rem;
		gap: 0.25rem;
		inset: 0 0 auto auto;
		pointer-events: none;
		transition: opacity variables.$transition;

		&::before {
			position: absolute;
			width: 4rem;
			height: 4rem;
			border-radius: 0 calc(variables.$radius - 1px) calc(variables.$radius - 1px) 0;
			background-image: radial-gradient(at top right, variables.$grey-1 25%, transparent 75%);
			content: '';
			inset: 0 0 auto auto;
		}

		&.large-shadow::before {
			width: 20rem;
			height: 6rem;
		}

		& > :global(div) {
			height: fit-content;
			pointer-events: all;
		}

		.action-trigger {
			z-index: 1;
		}
	}

	.previously {
		position: relative;
		padding: 0.75rem 1rem;

		&::before,
		&::after {
			position: absolute;
			z-index: -1;
			content: '';
			inset: -0.5rem 0 0;
		}

		&::before {
			border: 1px solid variables.$grey-3;
			border-radius: 0 0 variables.$radius variables.$radius;
			background-color: variables.$grey-2;
		}

		&::after {
			background-image: linear-gradient(rgba(variables.$grey-1, 0.5), transparent);
		}
	}
</style>
