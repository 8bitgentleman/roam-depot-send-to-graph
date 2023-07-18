import { Toaster, Intent} from "@blueprintjs/core";

const AppToaster = Toaster.create();

export const showToast = () => {
  AppToaster.show({ message: "You haven't added any Graph API Tokens to Send-To-Graph.", intent: Intent.WARNING });
};