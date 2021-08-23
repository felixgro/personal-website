import { createContainer, onProjectClick } from './ProjectFactory';
import { displayProject, closeTooltip } from './ProjectTooltip';
import { on } from '../utils/events';
import debounce from '../utils/debounce';

const focusCatch = document.querySelector('.focus-catch') as HTMLAnchorElement,
	scrollSpeed = .9,
	centeringFactor = .9,
	clickDebounce = 150;

let currentProject: HTMLAnchorElement | null,
	parentContainer: HTMLDivElement,
	firstContainer: HTMLDivElement,
	lastContainer: HTMLDivElement,
	subContainers: NodeListOf<Element>,
	parentBcr: DOMRect,
	currentScroll = 0,
	currentFrame = 0,
	isScrolling = false,
	isCentering = false,
	focused = false,
	margin = window.innerWidth * 1.5;

/**
 * Initialize by filling parent container with all configured projects, assign variables and start auto scrolling.
 */
export default () => {
	parentContainer = document.querySelector('.projects')!;
	parentBcr = parentContainer.getBoundingClientRect();

	onProjectClick(debounce((e: Event) => {
		e.preventDefault();

		const project = e.target as HTMLAnchorElement;
		if (project !== currentProject) centerProject(project);
	}, clickDebounce));

	fillParentContainer();
	firstContainer = parentContainer.firstElementChild as HTMLDivElement;
	lastContainer = parentContainer.lastElementChild as HTMLDivElement;
	startScrolling();

	parentContainer.ontouchmove = (e: Event) => e.preventDefault();
	parentContainer.onscroll = (e: Event) => e.preventDefault();

	on('resize', debounce(closeTooltip, 500))

	on('resize', debounce(() => {
		margin = window.innerWidth * 1.5;
		parentBcr = parentContainer.getBoundingClientRect();
	}, 500, {
		leading: false,
		trailing: true
	}));


	// Accessibility for project scroller

	const leftNeighbor = (): HTMLAnchorElement => {
		const subSection = currentProject!.parentElement!;
		let neighbor: Element;

		if (subSection.firstElementChild !== currentProject!) {
			neighbor = currentProject!.previousElementSibling!;
		} else {
			neighbor = subSection.previousElementSibling!.lastElementChild!;
		}

		return neighbor as HTMLAnchorElement;
	}

	const rightNeighbor = (): HTMLAnchorElement => {
		const subSection = currentProject!.parentElement!;
		let neighbor: Element;

		if (subSection.lastElementChild !== currentProject!) {
			neighbor = currentProject!.nextElementSibling!;
		} else {
			neighbor = subSection.nextElementSibling!.firstElementChild!;
		}

		return neighbor as HTMLAnchorElement;
	}

	focusCatch.onfocus = (e: Event) => {
		e.preventDefault();

		focused = true;
		subContainers = document.querySelectorAll('.sub-container');
		(subContainers[Math.floor((subContainers.length - 1) / 2)].children[0] as HTMLButtonElement).click();
	};

	on('key-Left', () => {
		if (!focused) return;
		leftNeighbor().click();
	});

	on('key-Right', () => {
		if (!focused) return;
		rightNeighbor().click();
	});

	on('key-Escape', () => {
		if (!focused) return;
		focused = false;

		startScrolling();
		closeTooltip();

		// put focus on following anchor
		(document.querySelector('footer.main a') as HTMLAnchorElement).focus();
	});
}

/**
* Appends a new container in parent.
* 
* @returns new container
*/
export const appendContainer = (): HTMLDivElement => {
	lastContainer = createContainer();
	parentContainer.appendChild(lastContainer);

	return lastContainer;
}

/**
 * Removes first container from parent.
 * 
 */
export const shiftContainer = () => {
	const width = firstContainer.clientWidth;

	firstContainer.remove();
	firstContainer = parentContainer.firstElementChild as HTMLDivElement;

	currentScroll -= width;
	parentContainer.scrollLeft = currentScroll;
}

/**
 * Prepends a new container in parent.
 * 
 * @returns new container
 */
export const prependContainer = (): HTMLDivElement => {
	firstContainer = createContainer();
	parentContainer.prepend(firstContainer);

	currentScroll += firstContainer.clientWidth;
	parentContainer.scrollLeft = currentScroll;

	return firstContainer;
}

/**
 * Removes last container from parent.
 */
export const popContainer = () => {
	lastContainer.remove();
	lastContainer = parentContainer.lastElementChild as HTMLDivElement;
}

/**
 * Animation loop for auto scrolling.
 */
const scrollAnimationFrame = () => {
	if (!isScrolling) return;
	currentFrame = window.requestAnimationFrame(scrollAnimationFrame);

	currentScroll += scrollSpeed;
	parentContainer.scrollLeft = currentScroll;

	const firstBcr = firstContainer.getBoundingClientRect();
	const lastBcr = lastContainer.getBoundingClientRect();

	if (firstBcr.x + firstBcr.width < margin * -1) shiftContainer();
	if (lastBcr.x + lastBcr.width < currentScroll + margin) appendContainer();
	if (lastBcr.x > currentScroll + margin) popContainer();
}

/**
 * Starts auto scrolling.
 */
export const startScrolling = () => {
	if (isScrolling) return;
	if (currentProject) {
		currentProject.classList.remove('active');
		currentProject = null;
	}
	isScrolling = true;
	currentScroll = parentContainer.scrollLeft;
	currentFrame = window.requestAnimationFrame(scrollAnimationFrame);
}

/**
 * Stops auto scrolling.
 */
export const stopScrolling = () => {
	if (!isScrolling) return;
	isScrolling = false;
	window.cancelAnimationFrame(currentFrame);
}

/**
 * Fills all available space (including specified margin) within parent using sub-containers and
 * subsequently centers the scroll position horizontally to enable seamless scrolling in both directions.
 */
const fillParentContainer = () => {
	let currentWidth = parentBcr.x;

	do {
		const subContainer = appendContainer();
		currentWidth += subContainer.clientWidth;

	} while (currentWidth < parentBcr.width + margin);

	currentScroll = margin;
	parentContainer.scrollLeft = currentScroll;
}

/**
 * Animates horizontal scroll by given amount in pixels.
 * This replaces `element.scrollBy({ left: amount, behaviour: 'smooth' })`
 * due to no support on safari.
 * 
 * @param amount 
 */
const scrollBy = (amount: number) => {
	return new Promise((resolve) => {
		const start = currentScroll,
			time = Math.abs(amount * centeringFactor),
			step = amount / 100;

		let currTime = 0,
			index = 0;

		const scrollStep = (i: number, step: number, start: number) =>
			parentContainer.scrollLeft = (i * step) + start;

		while (currTime <= time) {
			setTimeout(scrollStep, currTime, index, step, start);
			currTime += time / 100;
			index++;
		}

		setTimeout(() => {
			currentScroll += amount;
			resolve(true);
		}, currTime);
	});
}

/**
 * Scrolls smoothly through parent container in order to center
 * specified project.
 * 
 * @param projectElement 
 */
const centerProject = (projectElement: HTMLAnchorElement) => {
	if (isCentering) return;
	isCentering = true;
	stopScrolling();

	const bcr = projectElement.getBoundingClientRect(),
		rawDiff = (bcr.width / 2 + bcr.left) - (parentBcr.width / 2 + parentBcr.left),
		conDiff = rawDiff / parentContainer.firstElementChild!.clientWidth,
		conDiffRounded = conDiff >= 0 ? Math.ceil(conDiff) : Math.floor(conDiff);

	if (currentProject) currentProject.classList.remove('active');
	currentProject = projectElement;
	currentProject.classList.add('active');

	scrollBy(rawDiff).then(() => {
		displayProject(projectElement);

		for (let i = 0; i < Math.abs(conDiffRounded); i++) {
			(conDiffRounded < 0) ? prependContainer() : appendContainer();
		}
		isCentering = false;
	});
};