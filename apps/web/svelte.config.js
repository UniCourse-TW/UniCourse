import adapter from '@sveltejs/adapter-node';

export default {
  kit: { adapter: adapter() },
  compilerOptions: {
    // The legal pages restyle tables as stacked blocks on phones; CSS `display` changes drop the
    // implicit table roles in some browsers, so explicit `role="table"/"row"/…` is intentional there.
    warningFilter: (warning) =>
      !(warning.code === 'a11y_no_redundant_roles' && /routes\/(terms|privacy)\//.test(warning.filename ?? ''))
  }
};
