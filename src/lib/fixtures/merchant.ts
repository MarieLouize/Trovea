import type { Merchant } from '../types';

export const FIXTURE_MERCHANT: Merchant = {
  id: 'merchant-001',
  owner_id: 'user-001',
  display_name: 'Tola Adeyemi',
  store_name: "Tola's Archive",
  handle: 'tolasarchive',
  whatsapp: '+2348012345678',
  bio: 'Curated thrift & vintage finds. New bales weekly. Based in Lagos.',
  avatar_url: 'https://i.pravatar.cc/150?img=47',
  social_links: {
    instagram: 'tolasarchive',
    twitter: null,
    tiktok: 'tolasarchive',
  },
  initialized_at: '2024-03-15T10:00:00Z',
  last_active_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  store_open: true,
  whatsapp_template: null,
  store_config: {
    signature: 'the-bale',
    layout: 'grid-dense',
    palette: 'maroon',
    typography: 'editorial',
    card_style: 'clean-square',
    section_order: [
      'section-header',
      'section-featured',
      'section-grid',
      'section-contact',
    ],
    section_states: {
      'section-hero': false,
      'section-about': true,
      'section-slots': false,
      'section-featured': true,
    },
    hero_image_url: null,
    featured_item_ids: ['product-001', 'product-003', 'product-007'],
    about_text:
      'Every piece in this archive has been personally sourced and vetted. No reproductions. No fast fashion. Just quality pieces that deserve a second life.',
    item_display_order: null,
  },
};