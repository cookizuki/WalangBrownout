import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
type PageModule = { default: ComponentType & { layout?: (page: ReactNode) => ReactNode } };

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: async (name) => {
        const page = await resolvePageComponent<PageModule>(
            `./Pages/${name}.tsx`, import.meta.glob<PageModule>('./Pages/**/*.tsx'),
        );
        if (/^(Admin|Reorder|Batches|TransactionLog|Alerts)\//.test(name)) {
            page.default.layout = (content) => <AuthenticatedLayout>{content}</AuthenticatedLayout>;
        }
        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
