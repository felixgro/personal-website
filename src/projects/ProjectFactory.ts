import projects from './_projects.json';
import { memoize } from '../utils/functions';

export interface Project {
    title: string;
    url: string;
    repo: string;
    description: string;
    stack: string[];
}

let clickCallback: (this: GlobalEventHandlers, ev: MouseEvent) => any;


/**
* Creates a container filled with all projects.
* 
* @returns container element
**/
export const createContainer = (): HTMLDivElement => {
    const container = document.createElement('div');
    container.className = 'sub-container';

    addProjectsTo(container);

    return container;
};


/**
 * Fills container with specified projects as anchor tags.
 * 
 * @param container 
 */
const addProjectsTo = (container: Element): void => {
    for (const project of projects) {
        const p = document.createElement('div');
        p.className = 'project-anchor no-select';
        p.innerText = project.title;
        p.onclick = clickCallback;

        container.appendChild(p);
    }
};


/**
 * Finds project by it's title.
 * 
 * @param title - title of project
 * @returns project object or false if nothing found
 */
export const getProject = memoize((title: string): Project | false => {
    const project = projects.find(v => v.title === title) as Project;
    return project ? project : false;
});


/**
 * Registers an event listener for each project.
 * 
 * @param callback
 */
export const onProjectClick = (callback: (this: GlobalEventHandlers, ev: MouseEvent) => any): void => {
    clickCallback = callback;
};