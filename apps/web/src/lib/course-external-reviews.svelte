<script lang="ts">
  /*
   * Placeholder for the course page's external reviews section (indexed PTT posts and link-only search
   * links), which is built on another branch with the same file name and props. It renders nothing, so
   * the course page lays its ratings out full width until the real component lands.
   */
  interface Props {
    school: string;
    courseCode: string;
    /** `/api/courses/{school}/{courseCode}/external-reviews`; `undefined` when it could not be loaded. */
    reviews?: unknown;
  }

  let _props: Props = $props();
</script>
