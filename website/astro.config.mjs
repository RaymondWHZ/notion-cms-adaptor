// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';

// https://astro.build/config
export default defineConfig({
	site: 'https://raymondwhz.github.io',
	base: '/notion-cms-adaptor',
	integrations: [
		starlight({
		  plugins: [
        starlightThemeNova(/* options */),
      ],
			title: 'Notion CMS Adaptor',
			description: 'The ultimate type-safe Notion database toolbox for using Notion as a headless CMS',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/RaymondWHZ/notion-cms-adaptor' },
				{ icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/notion-cms-adaptor' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Introduction', slug: 'guides/introduction' },
						{ label: 'Quick Start', slug: 'guides/quick-start' },
						{ label: 'Configuration', slug: 'guides/configuration' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Schema Types', slug: 'reference/schema-types' },
						{ label: 'Client Functions', slug: 'reference/client-functions' },
						{ label: 'Type Utilities', slug: 'reference/type-utilities' },
					],
				},
			],
		}),
	],
});
