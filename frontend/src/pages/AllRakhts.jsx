import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/ui/index.jsx";
import RakhtManager from "../components/rakht/RakhtManager.jsx";

export default function AllRakhts() {
  const { t } = useTranslation();

  return (
    <div className="page">
      <PageHeader
        title={t("rakht.allTitle", { defaultValue: "All Rakhts" })}
        subtitle={t("rakht.allSubtitle", {
          defaultValue: "Browse, edit, and manage all Rakht inventory entries.",
        })}
      />
      <RakhtManager />
    </div>
  );
}
